'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Event, getPopularityLevel, getPopularityLabel, getEventTypeLabel, formatAgeRange, formatBoostPrice } from '@/types';
import { useEventStore } from '@/store/eventStore';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import {
  X,
  MapPin,
  Users,
  TrendingUp,
  Clock,
  Flame,
  Navigation,
  Crown,
  Calendar,
  Share2,
  Flag,
  ExternalLink,
  Eye,
  Heart,
  CheckCircle,
  Ticket,
  Edit,
  Trash2,
  Zap,
} from 'lucide-react';
import BoostModal from './BoostModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { debugUI, debugEvents, debugWallet } from '@/utils/debug';

interface EventDetailsProps {
  event: Event;
  onClose: () => void;
}

export default function EventDetails({ event: initialEvent, onClose }: EventDetailsProps) {
  const [boostAmount, setBoostAmount] = useState(5);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [hasClickedGoing, setHasClickedGoing] = useState(false);
  const [hasClickedOnTheWay, setHasClickedOnTheWay] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [hasCheckedInteractions, setHasCheckedInteractions] = useState(false);
  
  const { events, addBoost, markGoing, markOnTheWay, unmarkGoing, unmarkOnTheWay, markInterested, unmarkInterested, checkUserInterested, checkUserGoing, checkUserOnTheWay, reportEvent, purchaseTicketCategory, deleteEvent, incrementView } = useEventStore();
  const { user, isAuthenticated } = useAuthStore();
  const { wallet, transactions, purchaseTicket } = useWalletStore();

  // Usa evento atualizado do store se disponivel, senao usa o inicial
  const event = events.find((e) => e.id === initialEvent.id) || initialEvent;

  // Verifica se o usuário já interagiu com o evento ao carregar
  // Este useEffect roda toda vez que o componente monta (modal abre)
  useEffect(() => {
    debugUI.modalOpen(`EventDetails: ${event.name}`);
    console.log('📋 [EventDetails] Modal aberto para evento:', { id: event.id, name: event.name });
    
    // Reseta os estados quando o modal abre
    setHasClickedGoing(false);
    setHasClickedOnTheWay(false);
    setIsInterested(false);
    setHasCheckedInteractions(false);

    const checkUserInteractions = async () => {
      if (isAuthenticated && user) {
        console.log('🔍 [EventDetails] Verificando interações do usuário...', { userId: user.id, eventId: event.id });
        try {
          // Verifica interesse
          if (checkUserInterested) {
            const interested = await checkUserInterested(event.id, user.id);
            setIsInterested(interested);
            console.log('💖 [EventDetails] Status de interesse:', interested);
          }
          // Verifica "going"
          let going = false;
          if (checkUserGoing) {
            going = await checkUserGoing(event.id, user.id);
            setHasClickedGoing(going);
            console.log('✅ [EventDetails] Status de going:', going);
          }
          // Verifica "on_the_way"
          let onTheWay = false;
          if (checkUserOnTheWay) {
            onTheWay = await checkUserOnTheWay(event.id, user.id);
            setHasClickedOnTheWay(onTheWay);
            console.log('🚗 [EventDetails] Status de on_the_way:', onTheWay);
          }
          
          // Define os estados baseado no que foi encontrado no banco
          // Cada botão só pode ser clicado uma vez, mas ambos podem ser clicados independentemente
        } catch (error) {
          console.error('❌ [EventDetails] Erro ao verificar interações do usuário:', error);
        } finally {
          setHasCheckedInteractions(true);
        }
      } else {
        setHasCheckedInteractions(true);
      }
    };
    
    checkUserInteractions();
  }, [event.id, isAuthenticated, user?.id]); // Removido checkUserInterested, checkUserGoing, checkUserOnTheWay das dependências para evitar re-renders desnecessários

  // Incrementa visualização quando o modal é aberto (uma vez por usuário)
  useEffect(() => {
    if (isAuthenticated && user && incrementView) {
      incrementView(event.id, user.id);
    }
  }, [event.id, isAuthenticated, user, incrementView]);

  const popularityLevel = getPopularityLevel(event.currentAttendees);
  const isFull = event.currentAttendees >= event.maxCapacity;
  // Verifica se usuário tem ingresso baseado nas transações de compra
  const hasTicket = transactions.some(t => 
    t.type === 'purchase' && 
    t.referenceId === event.id && 
    t.status === 'completed'
  );
  const hasCategories = event.ticketCategories && event.ticketCategories.length > 0;
  const canPurchase = (hasCategories || event.price) && !hasTicket && !isFull && isAuthenticated;
  const isOrganizer = user?.id === event.organizerId;
  const isAdmin = user?.isAdmin || false;
  const canEdit = isOrganizer || isAdmin;
  const canDelete = isOrganizer || isAdmin;

  const formatEventDate = (date: Date) => {
    return format(new Date(date), "EEEE, dd 'de' MMMM 'as' HH:mm", { locale: ptBR });
  };

  const handlePurchaseTicket = async () => {
    debugUI.buttonClick('Comprar Ingresso', event.name);
    
    if (hasCategories) {
      // Compra com categoria
      if (!selectedCategoryId) {
        console.warn('⚠️ [EventDetails] Nenhuma categoria selecionada');
        alert('Selecione uma categoria de ingresso');
        return;
      }

      const category = event.ticketCategories!.find((c) => c.id === selectedCategoryId);
      if (!category) {
        console.error('❌ [EventDetails] Categoria não encontrada:', selectedCategoryId);
        alert('Categoria não encontrada');
        return;
      }

      if (category.stockRemaining <= 0) {
        console.warn('⚠️ [EventDetails] Ingressos esgotados para categoria:', category.name);
        alert('Ingressos esgotados para esta categoria');
        return;
      }

      if (balance < category.price) {
        debugWallet.insufficientFunds(category.price, balance);
        alert('Saldo insuficiente! Recarregue sua carteira primeiro.');
        setShowPurchaseModal(false);
        return;
      }

      setIsPurchasing(true);
      debugWallet.purchaseStart(event.name, category.price);

      try {
        await purchaseTicketCategory(event.id, selectedCategoryId);
        await purchaseTicket(event.id, event.name, category.price, category.id, category.name);
        setShowPurchaseModal(false);
        setSelectedCategoryId(null);
        debugWallet.purchaseSuccess(event.name, category.price);
        console.log('✅ [EventDetails] Ingresso comprado com sucesso!', { event: event.name, category: category.name, price: category.price });
        alert('Ingresso comprado com sucesso!');
        if (user) {
          await markGoing(event.id, user.id);
          setHasClickedGoing(true);
        }
      } catch (error: any) {
        debugWallet.purchaseError(error);
        console.error('❌ [EventDetails] Erro ao comprar ingresso:', error);
        alert('Erro ao comprar ingresso: ' + error.message);
      } finally {
        setIsPurchasing(false);
      }
    } else if (event.price) {
      // Compra tradicional (sem categorias)
      if (balance < event.price) {
        debugWallet.insufficientFunds(event.price, balance);
        alert('Saldo insuficiente! Recarregue sua carteira primeiro.');
        setShowPurchaseModal(false);
        return;
      }

      setIsPurchasing(true);
      debugWallet.purchaseStart(event.name, event.price);

      try {
        // Comprar ingresso via API (com comissão de 10%)
        const result = await purchaseTicket(event.id, event.name, event.price);
        
        if (!result.success) {
          throw new Error(result.message);
        }

        setShowPurchaseModal(false);
        debugWallet.purchaseSuccess(event.name, event.price);
        console.log('✅ [EventDetails] Ingresso comprado com sucesso!', { event: event.name, price: event.price });
        alert('Ingresso comprado com sucesso!');
        if (user) {
          await markGoing(event.id, user.id);
          setHasClickedGoing(true);
        }
      } catch (error: any) {
        debugWallet.purchaseError(error);
        console.error('❌ [EventDetails] Erro ao comprar ingresso:', error);
        alert('Erro ao comprar ingresso: ' + error.message);
      } finally {
        setIsPurchasing(false);
      }
    }
  };

  const handleBoost = async () => {
    debugUI.buttonClick('Dar Boost', event.name);
    console.log('🚀 [EventDetails] Adicionando boost:', { eventId: event.id, amount: boostAmount });
    await addBoost(event.id, boostAmount);
    console.log('✅ [EventDetails] Boost adicionado com sucesso');
    setShowBoostModal(false);
  };

  const handleReport = async () => {
    if (reportReason.trim()) {
      debugUI.buttonClick('Denunciar Evento', event.name);
      console.log('🚨 [EventDetails] Denunciando evento:', { eventId: event.id, reason: reportReason.substring(0, 50) + '...' });
      await reportEvent(event.id, reportReason);
      console.log('✅ [EventDetails] Denúncia enviada com sucesso');
      setShowReportModal(false);
      setReportReason('');
      alert('Denuncia enviada com sucesso. Nossa equipe ira analisar.');
    }
  };

  const handleShare = () => {
    debugUI.buttonClick('Compartilhar', event.name);
    console.log('📤 [EventDetails] Compartilhando evento:', event.name);
    if (navigator.share) {
      navigator.share({
        title: event.name,
        text: `Confira a festa ${event.name} no Aonde Ta o Role!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      console.log('📋 [EventDetails] Link copiado para clipboard');
      alert('Link copiado para a area de transferencia!');
    }
  };

  const handleDelete = () => {
    debugUI.buttonClick('Apagar Evento', event.name);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    setIsDeleting(true);
    debugEvents.deleteStart(event.id);
    
    try {
      await deleteEvent(event.id, user?.id, user?.isAdmin);
      debugEvents.deleteSuccess(event.id);
      console.log('✅ [EventDetails] Evento deletado com sucesso:', event.id);
      onClose();
    } catch (error: any) {
      debugEvents.deleteError(error);
      console.error('❌ [EventDetails] Erro ao deletar evento:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    debugUI.buttonClick('Editar Evento', event.name);
    console.log('✏️ [EventDetails] Redirecionando para edição:', event.id);
    // Redireciona para página de edição (vamos criar depois)
    window.location.href = `/cadastro-festa?edit=${event.id}`;
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" onClick={onClose}>
      {/* Overlay semi-transparente */}
      <div className="absolute inset-0 bg-dark-950/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        className="relative bg-dark-800/95 backdrop-blur-md rounded-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl border border-dark-600"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com imagem */}
        <div className="relative h-48">
          <img
            src={event.coverImage}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-transparent to-dark-800/50" />
          
          {/* Botao fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-dark-800/80 hover:bg-dark-700 p-2 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className={`badge badge-${popularityLevel}`}>
              <Flame size={14} className="mr-1" />
              {getPopularityLabel(popularityLevel)}
            </span>
            {event.isFree && <span className="badge badge-free">Gratis</span>}
            {event.isPremiumOrganizer && (
              <span className="badge badge-premium">
                <Crown size={14} className="mr-1" />
                Premium
              </span>
            )}
          </div>

          {/* Tipo */}
          <div className="absolute bottom-4 left-6">
            <span className="badge bg-dark-800/80 text-white">
              {getEventTypeLabel(event.eventType)}
            </span>
          </div>
        </div>

        {/* Conteudo */}
        <div className="p-6 space-y-6">
          {/* Titulo e organizador */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="font-display font-bold text-2xl text-white">{event.name}</h2>
                  <button
                    onClick={async () => {
                      debugUI.buttonClick('Favoritar', event.name);
                      if (isAuthenticated && user) {
                        if (isInterested) {
                          // Remove interesse
                          console.log('💔 [EventDetails] Removendo interesse:', event.id);
                          debugEvents.interactionStart('interested', event.id);
                          await unmarkInterested(event.id, user.id);
                          setIsInterested(false);
                          console.log('✅ [EventDetails] Interesse removido');
                        } else {
                          // Adiciona interesse
                          console.log('💖 [EventDetails] Adicionando interesse:', event.id);
                          debugEvents.interactionStart('interested', event.id);
                          await markInterested(event.id, user.id);
                          setIsInterested(true);
                          debugEvents.interactionSuccess('interested', event.id);
                          console.log('✅ [EventDetails] Interesse adicionado');
                        }
                      } else {
                        console.warn('⚠️ [EventDetails] Usuário não autenticado para favoritar');
                      }
                    }}
                    disabled={!isAuthenticated}
                    className={`flex-shrink-0 w-8 h-8 rounded-full bg-dark-700 border transition-all duration-300 flex items-center justify-center ${
                      isInterested
                        ? 'border-neon-pink bg-neon-pink/10'
                        : 'border-neon-pink/50 hover:border-neon-pink hover:bg-neon-pink/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isInterested ? 'Remover dos favoritos' : 'Favoritar evento'}
                  >
                    <Heart 
                      size={18} 
                      className={`transition-all duration-300 ${
                        isInterested
                          ? 'text-neon-pink fill-neon-pink' 
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-gray-400">
                  Por <span className="text-neon-pink">{event.organizerName}</span>
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleEdit}
                    className="p-2 bg-dark-700 hover:bg-neon-blue/20 border border-dark-600 hover:border-neon-blue rounded-lg transition-colors"
                    title={isAdmin ? "Editar festa (admin)" : "Editar festa"}
                  >
                    <Edit size={18} className="text-neon-blue" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="p-2 bg-dark-700 hover:bg-red-500/20 border border-dark-600 hover:border-red-500 rounded-lg transition-colors disabled:opacity-50"
                      title={isAdmin ? "Apagar festa (admin)" : "Apagar festa"}
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Descricao */}
          {event.description && (
            <p className="text-gray-300 leading-relaxed">{event.description}</p>
          )}

          {/* Info basica */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-neon-pink flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white">{event.address}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${event.coordinates.lat},${event.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neon-blue hover:underline inline-flex items-center gap-1"
                >
                  Ver no mapa <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-neon-blue flex-shrink-0" />
              <p className="text-white">{formatEventDate(event.startDate)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-neon-green flex-shrink-0" />
                <div>
                  <span className="text-gray-400 text-sm">Faixa Etária:</span>
                  <span className="text-white ml-2 font-medium">
                    {formatAgeRange(event.ageRange.min, event.ageRange.max)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users size={20} className="text-neon-blue flex-shrink-0" />
                <div>
                  <span className="text-gray-400 text-sm">Capacidade:</span>
                  <span className="text-white ml-2 font-medium">
                    {event.currentAttendees} de {event.maxCapacity} pessoas
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <Eye size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-2xl font-bold text-white">{event.views}</p>
              <p className="text-xs text-gray-500">Visualizacoes</p>
            </div>
            <div className="card text-center">
              <Heart size={24} className="mx-auto mb-2 text-neon-pink" />
              <p className="text-2xl font-bold text-white">{event.interestedCount}</p>
              <p className="text-xs text-gray-500">Interessados</p>
            </div>
            <div className="card text-center">
              <Users size={24} className="mx-auto mb-2 text-neon-blue" />
              <p className="text-2xl font-bold text-white">{event.goingCount}</p>
              <p className="text-xs text-gray-500">Confirmados</p>
            </div>
            <div className="card text-center">
              <Navigation size={24} className="mx-auto mb-2 text-neon-green" />
              <p className="text-2xl font-bold text-white">{event.onTheWayCount}</p>
              <p className="text-xs text-gray-500">A caminho</p>
            </div>
          </div>

          {/* Preco e Compra */}
          {!event.isFree && event.price && (
            <div className="card-highlight">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-300">Valor da entrada</span>
                <span className="font-display font-bold text-2xl text-white">
                  R$ {event.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
              
              {hasTicket ? (
                <div className="space-y-3">
                  <div className="p-4 bg-neon-green/20 border border-neon-green/50 rounded-lg">
                    <div className="flex items-center gap-2 text-neon-green mb-2">
                      <CheckCircle size={20} />
                      <span className="font-semibold">Ingresso Comprado</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Voce ja possui ingresso para este evento
                    </p>
                  </div>
                  <Link
                    href="/meus-ingressos"
                    className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    <Ticket size={20} />
                    Meus Ingressos
                  </Link>
                </div>
              ) : canPurchase ? (
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="w-full btn-primary py-4 text-lg"
                >
                  Comprar Ingresso
                </button>
              ) : !isAuthenticated ? (
                <p className="text-sm text-gray-400 text-center">
                  Faca login para comprar ingressos
                </p>
              ) : isFull ? (
                <p className="text-sm text-red-400 text-center">
                  Evento lotado
                </p>
              ) : null}
            </div>
          )}

          {/* Boosts */}
          <div className="card-highlight">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={24} className="text-neon-pink" />
                <span className="font-display font-bold text-xl text-white">{event.boosts}</span>
                <span className="text-gray-400">boosts</span>
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => setShowBoostModal(true)}
                  className={`py-2 px-4 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    event.boosts > 0 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600' 
                      : 'bg-dark-700 border border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                  }`}
                  title="Dar boost para destacar este evento"
                >
                  <Zap size={18} />
                  Dar Boost
                </button>
              )}
            </div>
            <p className="text-sm text-gray-400">
              Boosts aumentam a visibilidade do evento no ranking e no mapa. Qualquer usuário pode dar boost!
            </p>
          </div>

          {/* Acoes principais */}
          {hasTicket ? (
            // Se tem ingresso, mostra apenas "Estou a Caminho"
            <button
              onClick={async () => {
                debugUI.buttonClick('Estou a Caminho (com ingresso)', event.name);
                if (isAuthenticated && user) {
                  if (hasClickedOnTheWay) {
                    // Se já está marcado, desmarca
                    console.log('🚫 [EventDetails] Desmarcando on_the_way (com ingresso):', event.id);
                    debugEvents.interactionStart('on_the_way', event.id);
                    await unmarkOnTheWay(event.id, user.id);
                    setHasClickedOnTheWay(false);
                    console.log('✅ [EventDetails] On_the_way desmarcado');
                  } else {
                    // Se não está marcado, marca
                    console.log('🚗 [EventDetails] Marcando on_the_way (com ingresso):', event.id);
                    debugEvents.interactionStart('on_the_way', event.id);
                    await markOnTheWay(event.id, user.id);
                    setHasClickedOnTheWay(true);
                    debugEvents.interactionSuccess('on_the_way', event.id);
                    console.log('✅ [EventDetails] On_the_way marcado');
                  }
                } else {
                  console.warn('⚠️ [EventDetails] Usuário não autenticado');
                }
              }}
              disabled={!isAuthenticated}
              className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
                hasClickedOnTheWay
                  ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-500'
                  : 'bg-dark-700 border border-neon-green text-neon-green hover:bg-neon-green hover:text-dark-900'
              } disabled:opacity-50`}
            >
              {hasClickedOnTheWay ? 'Não estou mais a caminho' : 'Estou a Caminho'}
            </button>
          ) : (
            // Se nao tem ingresso, mostra ambos os botoes
            <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={async () => {
                    debugUI.buttonClick('Quero Ir', event.name);
                    if (!isFull && isAuthenticated && user) {
                      if (hasClickedGoing) {
                        // Se já está marcado, desmarca
                        console.log('🚫 [EventDetails] Desmarcando going:', event.id);
                        debugEvents.interactionStart('going', event.id);
                        await unmarkGoing(event.id, user.id);
                        setHasClickedGoing(false);
                        console.log('✅ [EventDetails] Going desmarcado');
                      } else {
                        // Se não está marcado, marca
                        console.log('✅ [EventDetails] Marcando going:', event.id);
                        debugEvents.interactionStart('going', event.id);
                        await markGoing(event.id, user.id);
                        setHasClickedGoing(true);
                        debugEvents.interactionSuccess('going', event.id);
                        console.log('✅ [EventDetails] Going marcado');
                      }
                    } else if (isFull) {
                      console.warn('⚠️ [EventDetails] Evento lotado, não é possível marcar going');
                    } else {
                      console.warn('⚠️ [EventDetails] Usuário não autenticado');
                    }
                  }}
                  disabled={isFull || !isAuthenticated}
                className={`py-4 rounded-xl font-semibold transition-all duration-300 ${
                  hasClickedGoing
                    ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-500'
                    : isFull
                    ? 'bg-dark-600 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-neon-pink to-neon-purple text-white hover:shadow-neon-pink'
                }`}
              >
                {hasClickedGoing ? 'Desistir do Evento' : isFull ? 'Lotado' : 'Quero Ir'}
              </button>
                <button
                  onClick={async () => {
                    debugUI.buttonClick('Estou a Caminho', event.name);
                    if (isAuthenticated && user) {
                      if (hasClickedOnTheWay) {
                        // Se já está marcado, desmarca
                        console.log('🚫 [EventDetails] Desmarcando on_the_way:', event.id);
                        debugEvents.interactionStart('on_the_way', event.id);
                        await unmarkOnTheWay(event.id, user.id);
                        setHasClickedOnTheWay(false);
                        console.log('✅ [EventDetails] On_the_way desmarcado');
                      } else {
                        // Se não está marcado, marca
                        console.log('🚗 [EventDetails] Marcando on_the_way:', event.id);
                        debugEvents.interactionStart('on_the_way', event.id);
                        await markOnTheWay(event.id, user.id);
                        setHasClickedOnTheWay(true);
                        debugEvents.interactionSuccess('on_the_way', event.id);
                        console.log('✅ [EventDetails] On_the_way marcado');
                      }
                    } else {
                      console.warn('⚠️ [EventDetails] Usuário não autenticado');
                    }
                  }}
                  disabled={!isAuthenticated}
                className={`py-4 rounded-xl font-semibold transition-all duration-300 ${
                  hasClickedOnTheWay
                    ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-500'
                    : 'bg-dark-700 border border-neon-green text-neon-green hover:bg-neon-green hover:text-dark-900'
                } disabled:opacity-50`}
              >
                {hasClickedOnTheWay ? 'Não estou mais a caminho' : 'Estou a Caminho'}
              </button>
            </div>
          )}

          {/* Lista de convidados (apenas premium) */}
          {event.isPremiumOrganizer && user?.isPremium && (
            <div className="card">
              <h4 className="font-display font-bold text-white mb-3">Lista de Convidados</h4>
              <p className="text-sm text-gray-400 mb-3">
                Organizadores premium podem adicionar convidados diretamente.
              </p>
              <button className="btn-secondary w-full py-2">
                Entrar na Lista
              </button>
            </div>
          )}

          {/* Botoes secundarios */}
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="btn-ghost flex-1 flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
              Compartilhar
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="btn-ghost flex-1 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/20"
            >
              <Flag size={18} />
              Denunciar
            </button>
          </div>
        </div>

        {/* Modal de Compra de Ingresso */}
        {showPurchaseModal && (hasCategories || event.price) && (
          <div className="fixed inset-0 bg-dark-950/90 flex items-center justify-center z-[2100]" onClick={() => {
            setShowPurchaseModal(false);
            setSelectedCategoryId(null);
          }}>
            <div className="bg-dark-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up border border-dark-600" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-xl text-white mb-4">Comprar Ingresso</h3>
              
              {/* Info do evento */}
              <div className="mb-6 p-4 bg-dark-700 rounded-lg">
                <p className="font-semibold text-white mb-2">{event.name}</p>
                <p className="text-sm text-gray-400">{event.address}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {formatEventDate(event.startDate)}
                </p>
              </div>

              {/* Seleção de categoria ou preço único */}
              {hasCategories ? (
                <div className="mb-6">
                  <label className="input-label mb-3 block">Selecione a Categoria:</label>
                  <div className="space-y-2">
                    {event.ticketCategories!.map((category) => {
                      const isSoldOut = category.stockRemaining <= 0;
                      const isSelected = selectedCategoryId === category.id;
                      const canAfford = balance >= category.price;
                      
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => !isSoldOut && setSelectedCategoryId(category.id)}
                          disabled={isSoldOut}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-neon-pink bg-neon-pink/10'
                              : isSoldOut
                              ? 'border-dark-600 bg-dark-700/50 opacity-50 cursor-not-allowed'
                              : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white">{category.name}</span>
                            <span className={`font-bold text-lg ${canAfford ? 'text-neon-green' : 'text-red-400'}`}>
                              R$ {category.price.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          {category.description && (
                            <p className="text-xs text-gray-400 mb-2">{category.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${isSoldOut ? 'text-red-400' : 'text-gray-400'}`}>
                              {isSoldOut ? 'Esgotado' : `${category.stockRemaining} disponíveis`}
                            </span>
                            {isSelected && (
                              <span className="text-xs text-neon-pink font-semibold">✓ Selecionado</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : event.price ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                    <span className="text-gray-300">Valor do ingresso</span>
                    <span className="font-display font-bold text-2xl text-white">
                      R$ {event.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Saldo */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                  <span className="text-gray-300">Saldo disponível</span>
                  <span className={`font-bold text-lg ${
                    hasCategories && selectedCategoryId
                      ? balance >= (event.ticketCategories!.find(c => c.id === selectedCategoryId)?.price || 0)
                        ? 'text-neon-green'
                        : 'text-red-400'
                      : event.price
                      ? balance >= event.price
                        ? 'text-neon-green'
                        : 'text-red-400'
                      : 'text-gray-400'
                  }`}>
                    R$ {balance.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                {hasCategories && selectedCategoryId && (
                  (() => {
                    const selectedCategory = event.ticketCategories!.find(c => c.id === selectedCategoryId);
                    return selectedCategory && balance < selectedCategory.price && (
                      <p className="text-sm text-red-400 mt-2">
                        Saldo insuficiente. Recarregue sua carteira primeiro.
                      </p>
                    );
                  })()
                )}
                {!hasCategories && event.price && balance < event.price && (
                  <p className="text-sm text-red-400 mt-2">
                    Saldo insuficiente. Recarregue sua carteira primeiro.
                  </p>
                )}
              </div>

              {/* Botoes */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedCategoryId(null);
                  }}
                  className="btn-ghost flex-1"
                  disabled={isPurchasing}
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePurchaseTicket}
                  className="btn-primary flex-1"
                  disabled={
                    isPurchasing ||
                    (hasCategories && !selectedCategoryId) ||
                    (hasCategories && selectedCategoryId && (() => {
                      const cat = event.ticketCategories!.find(c => c.id === selectedCategoryId);
                      return !cat || balance < cat.price || cat.stockRemaining <= 0;
                    })()) ||
                    (!hasCategories && event.price && balance < event.price)
                  }
                >
                  {isPurchasing ? (
                    <>
                      <span className="loading-spinner w-5 h-5 mr-2" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Compra'
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                Pagamento processado pela carteira digital
              </p>
            </div>
          </div>
        )}

        {/* Modal de Boost */}
        <BoostModal
          isOpen={showBoostModal}
          onClose={() => setShowBoostModal(false)}
          eventId={event.id}
          eventName={event.name}
          currentBoosts={event.boosts || 0}
          onSuccess={() => {
            // Recarrega os eventos para atualizar o contador de boosts
            // O store irá atualizar automaticamente
          }}
        />

        {/* Modal de Denuncia */}
        {showReportModal && (
          <div className="fixed inset-0 bg-dark-950/90 flex items-center justify-center z-[2100]" onClick={() => setShowReportModal(false)}>
            <div className="bg-dark-800 rounded-xl p-6 max-w-sm w-full mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-xl text-white mb-4">Denunciar Festa</h3>
              
              <div className="mb-4">
                <label className="input-label">Motivo da denuncia</label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Descreva o problema..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowReportModal(false)} className="btn-ghost flex-1">
                  Cancelar
                </button>
                <button onClick={handleReport} className="btn-danger flex-1">
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Delete */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-dark-950/90 flex items-center justify-center z-[2100]" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-dark-800 rounded-2xl p-6 max-w-md w-full mx-4 animate-slide-up border border-red-500/30" onClick={(e) => e.stopPropagation()}>
              {/* Ícone */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 size={32} className="text-red-400" />
              </div>
              
              {/* Título */}
              <h3 className="font-display font-bold text-xl text-white text-center mb-2">
                Apagar Festa?
              </h3>
              
              {/* Mensagem */}
              <p className="text-gray-400 text-center mb-2">
                Tem certeza que deseja apagar a festa
              </p>
              <p className="text-white font-semibold text-center mb-4">
                "{event.name}"
              </p>
              
              {/* Alerta */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-400 text-center">
                  ⚠️ Esta ação não pode ser desfeita!
                </p>
              </div>
              
              {/* Botões */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="btn-ghost flex-1 py-3"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete} 
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <span className="loading-spinner w-5 h-5" />
                      Apagando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Apagar Festa
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

