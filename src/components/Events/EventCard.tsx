'use client';

import { useState, useEffect } from 'react';
import { Event, getPopularityLevel, getPopularityLabel, getEventTypeLabel, formatAgeRange } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import BoostModal from './BoostModal';
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  Clock, 
  Flame,
  Navigation,
  Crown,
  Calendar,
  Edit,
  Trash2,
  Heart,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventCardProps {
  event: Event;
  rank?: number;
  onBoost?: () => void;
  onInterested?: () => void;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onBoostSuccess?: () => void;
}

export default function EventCard({ event, rank, onBoost, onInterested, onViewDetails, onEdit, onDelete, onBoostSuccess }: EventCardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { checkUserInterested, markInterested, unmarkInterested } = useEventStore();
  const [isInterested, setIsInterested] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const popularityLevel = getPopularityLevel(event.currentAttendees);
  const isFull = event.currentAttendees >= event.maxCapacity;
  const isOrganizer = user?.id === event.organizerId;
  const isAdmin = user?.isAdmin || false;
  const canEdit = isOrganizer || isAdmin;
  const canDelete = isOrganizer || isAdmin;
  const hasBoosts = event.boosts > 0;

  // Verifica se o usuário já está interessado ao carregar
  useEffect(() => {
    const checkInterested = async () => {
      if (isAuthenticated && user && checkUserInterested) {
        const interested = await checkUserInterested(event.id, user.id);
        setIsInterested(interested);
      }
    };
    checkInterested();
  }, [event.id, isAuthenticated, user, checkUserInterested]);

  const formatEventDate = (date: Date) => {
    return format(new Date(date), "EEE, dd 'de' MMM 'as' HH:mm", { locale: ptBR });
  };

  return (
    <div className="card hover:border-neon-pink/50 group relative overflow-hidden">
      {/* Ranking badge */}
      {rank && rank <= 3 && (
        <div className="absolute top-4 left-4 z-10">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg
            ${rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dark-900' : ''}
            ${rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-dark-900' : ''}
            ${rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' : ''}
          `}>
            {rank}
          </div>
        </div>
      )}

      {/* Imagem de capa */}
      <div className="relative h-48 -mx-6 -mt-6 mb-4 overflow-hidden">
        <img
          src={event.coverImage}
          alt={event.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent" />
        
        {/* Badges no topo */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {hasBoosts && (
            <span className="badge bg-gradient-to-r from-orange-500 to-red-500 text-white border-none animate-pulse">
              <Flame size={12} className="mr-1" />
              Em Alta 🔥
            </span>
          )}
          <span className={`badge badge-${popularityLevel}`}>
            <Flame size={12} className="mr-1" />
            {getPopularityLabel(popularityLevel)}
          </span>
          {event.isFree && (
            <span className="badge badge-free">Gratis</span>
          )}
          {event.isPremiumOrganizer && (
            <span className="badge badge-premium">
              <Crown size={12} className="mr-1" />
              Premium
            </span>
          )}
        </div>

        {/* Tipo de evento */}
        <div className="absolute bottom-4 left-4">
          <span className="badge bg-dark-800/80 text-white text-xs">
            {getEventTypeLabel(event.eventType)}
          </span>
        </div>
      </div>

      {/* Conteudo */}
      <div className="space-y-4">
        {/* Titulo */}
        <div className="flex items-start gap-2">
          <h3 className="font-display font-bold text-xl text-white group-hover:text-neon-pink transition-colors flex-1">
            {event.name}
          </h3>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (isAuthenticated && user) {
                if (isInterested) {
                  // Remove interesse
                  await unmarkInterested(event.id, user.id);
                  setIsInterested(false);
                  // Chama callback se existir (para atualizar estado no parent)
                  if (onInterested) {
                    onInterested();
                  }
                } else {
                  // Adiciona interesse
                  await markInterested(event.id, user.id);
                  setIsInterested(true);
                  // Chama callback se existir
                  if (onInterested) {
                    onInterested();
                  }
                }
              }
            }}
            disabled={!isAuthenticated}
            className={`flex-shrink-0 w-8 h-8 rounded-full bg-dark-700 border transition-all duration-300 flex items-center justify-center group/heart ${
              isInterested
                ? 'border-neon-pink bg-neon-pink/10'
                : 'border-neon-pink/50 hover:border-neon-pink hover:bg-neon-pink/10'
            } disabled:opacity-50`}
            title={isInterested ? 'Remover dos favoritos' : 'Favoritar evento'}
          >
            <Heart 
              size={18} 
              className={`transition-all duration-300 ${
                isInterested
                  ? 'text-neon-pink fill-neon-pink' 
                  : 'text-gray-400 group-hover/heart:text-neon-pink'
              }`}
            />
          </button>
        </div>
        {event.description && (
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{event.description}</p>
        )}

        {/* Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <MapPin size={16} className="text-neon-pink flex-shrink-0" />
            <span className="truncate">{event.address}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Calendar size={16} className="text-neon-blue flex-shrink-0" />
            <span>{formatEventDate(event.startDate)}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Users size={16} className="text-neon-green flex-shrink-0" />
              <span className="font-medium text-white">Faixa Etária:</span>
              <span>{formatAgeRange(event.ageRange.min, event.ageRange.max)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Users size={16} className="text-neon-blue flex-shrink-0" />
              <span className="font-medium text-white">Capacidade:</span>
              <span>{event.currentAttendees} de {event.maxCapacity} pessoas</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-dark-600">
          <div className="text-center">
            <p className="text-2xl font-bold text-neon-blue">{event.goingCount}</p>
            <p className="text-xs text-gray-500">Confirmados</p>
          </div>
          <div className="text-center border-x border-dark-600">
            <p className="text-2xl font-bold text-neon-green">{event.onTheWayCount}</p>
            <p className="text-xs text-gray-500">A caminho</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-neon-pink">{event.boosts}</p>
            <p className="text-xs text-gray-500">Boosts</p>
          </div>
        </div>

        {/* Preco */}
        {!event.isFree && (event.ticketCategories && event.ticketCategories.length > 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Entrada</span>
            <div className="text-right">
              <span className="font-bold text-white text-lg block">
                {(() => {
                  const prices = event.ticketCategories!.map(c => c.price);
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  return minPrice === maxPrice 
                    ? `R$ ${minPrice.toFixed(2).replace('.', ',')}`
                    : `R$ ${minPrice.toFixed(2).replace('.', ',')} - R$ ${maxPrice.toFixed(2).replace('.', ',')}`;
                })()}
              </span>
              <span className="text-xs text-gray-500">{event.ticketCategories.length} categorias</span>
            </div>
          </div>
        ) : event.price ? (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Entrada</span>
            <span className="font-bold text-white text-lg">
              R$ {event.price.toFixed(2).replace('.', ',')}
            </span>
          </div>
        ) : null)}

        {/* Acoes */}
        <div className="flex gap-3">
          <button
            onClick={onViewDetails}
            className="btn-primary flex-1 text-center"
          >
            Ver Detalhes
          </button>
          {/* Botão de Boost - disponível para qualquer usuário logado */}
          {isAuthenticated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBoostModal(true);
              }}
              className={`px-4 rounded-xl font-semibold transition-all flex items-center gap-1 ${
                hasBoosts 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600' 
                  : 'bg-dark-700 border border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
              }`}
              title="Dar boost para destacar este evento"
            >
              <Zap size={18} />
              <span className="text-sm">{event.boosts || 0}</span>
            </button>
          )}
          {canEdit && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="btn-ghost px-3"
              title={isAdmin ? "Editar festa (admin)" : "Editar festa"}
            >
              <Edit size={18} />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              className="btn-ghost px-3 text-red-400 hover:text-red-300"
              title={isAdmin ? "Apagar festa (admin)" : "Apagar festa"}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        {/* Botao Quero Ir */}
        <button
          onClick={onInterested}
          disabled={isFull}
          className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
            isFull
              ? 'bg-dark-600 text-gray-500 cursor-not-allowed'
              : 'bg-dark-700 border border-neon-green text-neon-green hover:bg-neon-green hover:text-dark-900'
          }`}
        >
          {isFull ? 'Lotado' : 'Quero Ir'}
        </button>
      </div>

      {/* Modal de Confirmação de Delete */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-dark-950/90 flex items-center justify-center z-[2100]" 
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteModal(false);
          }}
        >
          <div 
            className="bg-dark-800 rounded-2xl p-6 max-w-md w-full mx-4 animate-slide-up border border-red-500/30" 
            onClick={(e) => e.stopPropagation()}
          >
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
              Tem certeza que deseja apagar
            </p>
            <p className="text-white font-semibold text-center mb-4 truncate px-4">
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                }} 
                className="btn-ghost flex-1 py-3"
              >
                Cancelar
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                  onDelete?.();
                }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Apagar
              </button>
            </div>
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
          onBoostSuccess?.();
        }}
      />
    </div>
  );
}

