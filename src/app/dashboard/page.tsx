'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import { useWalletStore } from '@/store/walletStore';
import { Event, GuestListEntry, getPopularityLevel, getPopularityLabel, formatAgeRange } from '@/types';
import {
  LayoutDashboard,
  PartyPopper,
  Users,
  Eye,
  TrendingUp,
  Navigation,
  Heart,
  Plus,
  Edit,
  Trash2,
  Download,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Calendar,
  Crown,
  Ticket,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TicketSalesDashboard from '@/components/Dashboard/TicketSalesDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { events, fetchEvents, addToGuestList, updateGuestStatus, removeFromGuestList } = useEventStore();
  const { transactions } = useWalletStore();
  
  const [selectedTab, setSelectedTab] = useState<'overview' | 'events' | 'guests' | 'sales'>('overview');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', phone: '', email: '' });

  // Filtra eventos do usuario
  const myEvents = events.filter((e) => e.organizerId === user?.id);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/dashboard');
      return;
    }
    
    if (!user?.isPremium) {
      router.push('/premium');
      return;
    }

    fetchEvents();
  }, [isAuthenticated, user, router, fetchEvents]);

  // Estatisticas gerais
  const totalViews = myEvents.reduce((acc, e) => acc + e.views, 0);
  const totalInterested = myEvents.reduce((acc, e) => acc + e.interestedCount, 0);
  const totalGoing = myEvents.reduce((acc, e) => acc + e.goingCount, 0);
  const totalBoosts = myEvents.reduce((acc, e) => acc + e.boosts, 0);

  const handleAddGuest = () => {
    if (selectedEvent && newGuest.name.trim()) {
      addToGuestList(selectedEvent.id, {
        eventId: selectedEvent.id,
        name: newGuest.name,
        phone: newGuest.phone || undefined,
        email: newGuest.email || undefined,
        status: 'pending',
      });
      setNewGuest({ name: '', phone: '', email: '' });
      setShowAddGuestModal(false);
    }
  };

  const exportGuestList = (event: Event) => {
    if (!event.guestList || event.guestList.length === 0) {
      alert('Lista de convidados vazia');
      return;
    }

    const csv = [
      ['Nome', 'Telefone', 'Email', 'Status', 'Data Adicao'].join(','),
      ...event.guestList.map((g) =>
        [
          g.name,
          g.phone || '',
          g.email || '',
          g.status,
          format(new Date(g.addedAt), 'dd/MM/yyyy HH:mm'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lista-${event.name.replace(/\s+/g, '-')}.csv`;
    link.click();
  };

  if (!isAuthenticated || !user?.isPremium) {
    return null;
  }

  return (
    <Layout>
      <div className="container-app py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={24} className="text-neon-pink" />
              <span className="badge badge-premium">Premium</span>
            </div>
            <h1 className="font-display font-bold text-3xl text-white">
              Dashboard do <span className="text-neon-pink">Organizador</span>
            </h1>
            <p className="text-gray-400">Gerencie seus eventos e convidados</p>
          </div>
          <button
            onClick={() => router.push('/cadastro-festa')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Festa
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Visao Geral', icon: BarChart3 },
            { id: 'events', label: 'Meus Eventos', icon: PartyPopper },
            { id: 'guests', label: 'Lista de Convidados', icon: Users },
            { id: 'sales', label: 'Vendas', icon: Ticket },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-neon-pink text-white'
                    : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Visao Geral */}
        {selectedTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-highlight">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-neon-pink/20 flex items-center justify-center">
                    <PartyPopper size={20} className="text-neon-pink" />
                  </div>
                  <span className="text-gray-400">Eventos</span>
                </div>
                <p className="font-display font-bold text-3xl text-white">{myEvents.length}</p>
              </div>

              <div className="card-highlight">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-neon-blue/20 flex items-center justify-center">
                    <Eye size={20} className="text-neon-blue" />
                  </div>
                  <span className="text-gray-400">Visualizacoes</span>
                </div>
                <p className="font-display font-bold text-3xl text-white">{totalViews.toLocaleString()}</p>
              </div>

              <div className="card-highlight">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-neon-green/20 flex items-center justify-center">
                    <Users size={20} className="text-neon-green" />
                  </div>
                  <span className="text-gray-400">Confirmados</span>
                </div>
                <p className="font-display font-bold text-3xl text-white">{totalGoing}</p>
              </div>

              <div className="card-highlight">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                    <TrendingUp size={20} className="text-neon-purple" />
                  </div>
                  <span className="text-gray-400">Boosts</span>
                </div>
                <p className="font-display font-bold text-3xl text-white">{totalBoosts}</p>
              </div>
            </div>

            {/* Eventos recentes */}
            <div>
              <h2 className="font-display font-bold text-xl text-white mb-4">Eventos Recentes</h2>
              {myEvents.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {myEvents.slice(0, 4).map((event) => (
                    <EventDashboardCard key={event.id} event={event} onExport={exportGuestList} />
                  ))}
                </div>
              ) : (
                <div className="card text-center py-12">
                  <PartyPopper size={48} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400 mb-4">Voce ainda nao tem eventos cadastrados</p>
                  <button
                    onClick={() => router.push('/cadastro-festa')}
                    className="btn-primary"
                  >
                    Criar Primeiro Evento
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Meus Eventos */}
        {selectedTab === 'events' && (
          <div className="space-y-4">
            {myEvents.length > 0 ? (
              myEvents.map((event) => (
                <EventDashboardCard
                  key={event.id}
                  event={event}
                  onExport={exportGuestList}
                  expanded
                />
              ))
            ) : (
              <div className="card text-center py-12">
                <PartyPopper size={48} className="mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400 mb-4">Nenhum evento encontrado</p>
                <button
                  onClick={() => router.push('/cadastro-festa')}
                  className="btn-primary"
                >
                  Criar Evento
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Lista de Convidados */}
        {selectedTab === 'guests' && (
          <div className="space-y-6">
            {/* Seletor de evento */}
            <div>
              <label className="input-label">Selecionar Evento</label>
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => {
                  const event = myEvents.find((ev) => ev.id === e.target.value);
                  setSelectedEvent(event || null);
                }}
                className="input-field"
              >
                <option value="">Selecione um evento</option>
                {myEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent ? (
              <>
                {/* Acoes */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddGuestModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <UserPlus size={18} />
                    Adicionar Convidado
                  </button>
                  <button
                    onClick={() => exportGuestList(selectedEvent)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download size={18} />
                    Exportar CSV
                  </button>
                </div>

                {/* Lista de convidados */}
                {selectedEvent.guestList && selectedEvent.guestList.length > 0 ? (
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-dark-700">
                          <tr>
                            <th className="text-left p-4 text-gray-400 font-medium">Nome</th>
                            <th className="text-left p-4 text-gray-400 font-medium">Contato</th>
                            <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                            <th className="text-left p-4 text-gray-400 font-medium">Data</th>
                            <th className="text-right p-4 text-gray-400 font-medium">Acoes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEvent.guestList.map((guest) => (
                            <GuestRow
                              key={guest.id}
                              guest={guest}
                              eventId={selectedEvent.id}
                              onUpdateStatus={updateGuestStatus}
                              onRemove={removeFromGuestList}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="card text-center py-12">
                    <Users size={48} className="mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">Nenhum convidado na lista</p>
                  </div>
                )}
              </>
            ) : (
              <div className="card text-center py-12">
                <Users size={48} className="mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">Selecione um evento para gerenciar a lista de convidados</p>
              </div>
            )}
          </div>
        )}

        {/* Modal Adicionar Convidado */}
        {showAddGuestModal && (
          <div className="modal-overlay" onClick={() => setShowAddGuestModal(false)}>
            <div
              className="bg-dark-800 rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display font-bold text-xl text-white mb-4">
                Adicionar Convidado
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="input-label">Nome *</label>
                  <input
                    type="text"
                    value={newGuest.name}
                    onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                    placeholder="Nome completo"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Telefone</label>
                  <input
                    type="tel"
                    value={newGuest.phone}
                    onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    value={newGuest.email}
                    onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddGuestModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button onClick={handleAddGuest} className="btn-primary flex-1">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Vendas */}
        {selectedTab === 'sales' && (
          <div className="space-y-6">
            <TicketSalesDashboard />
          </div>
        )}
      </div>
    </Layout>
  );
}

// Componente de card do evento no dashboard
function EventDashboardCard({
  event,
  onExport,
  expanded = false,
}: {
  event: Event;
  onExport: (e: Event) => void;
  expanded?: boolean;
}) {
  const { transactions } = useWalletStore();
  const popularityLevel = getPopularityLevel(event.currentAttendees);
  
  // Calcula vendas por categoria
  const eventTransactions = transactions.filter(
    (t) => t.type === 'purchase' && t.eventId === event.id
  );
  
  const salesByCategory = event.ticketCategories?.map((category) => {
    const categorySales = eventTransactions.filter(
      (t) => t.ticketCategoryId === category.id
    );
    return {
      category,
      sold: categorySales.length,
      revenue: categorySales.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      remaining: category.stockRemaining,
    };
  }) || [];

  return (
    <div className="card">
      <div className="flex gap-4">
        {/* Imagem */}
        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
          <img src={event.coverImage} alt={event.name} className="w-full h-full object-cover" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-lg text-white truncate">{event.name}</h3>
              <p className="text-sm text-gray-400">
                {format(new Date(event.startDate), "dd 'de' MMM, HH:mm", { locale: ptBR })}
              </p>
            </div>
            <span className={`badge badge-${popularityLevel} text-xs`}>
              {getPopularityLabel(popularityLevel)}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-neon-blue">{event.views}</p>
              <p className="text-xs text-gray-500">Views</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-neon-pink">{event.interestedCount}</p>
              <p className="text-xs text-gray-500">Interesse</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-neon-green">{event.goingCount}</p>
              <p className="text-xs text-gray-500">Confirmados</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-neon-purple">{event.onTheWayCount}</p>
              <p className="text-xs text-gray-500">A caminho</p>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-dark-600 space-y-4">
          {/* Vendas por categoria */}
          {event.ticketCategories && event.ticketCategories.length > 0 && (
            <div>
              <h4 className="font-display font-bold text-white mb-3 flex items-center gap-2">
                <BarChart3 size={18} className="text-neon-pink" />
                Vendas por Categoria
              </h4>
              <div className="space-y-2">
                {salesByCategory.map(({ category, sold, revenue, remaining }) => (
                  <div
                    key={category.id}
                    className="p-3 bg-dark-700 rounded-lg border border-dark-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-white">{category.name}</p>
                        {category.description && (
                          <p className="text-xs text-gray-400">{category.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-neon-green">
                          R$ {revenue.toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-xs text-gray-400">
                          {sold} vendidos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        Estoque: {remaining}/{category.stockTotal}
                      </span>
                      <span className="text-gray-400">
                        Preço: R$ {category.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {remaining === 0 && (
                      <span className="inline-block mt-2 text-xs text-red-400 font-semibold">
                        Esgotado
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <button className="btn-ghost text-sm flex items-center gap-1">
              <Edit size={16} />
              Editar
            </button>
            <button
              onClick={() => onExport(event)}
              className="btn-ghost text-sm flex items-center gap-1"
            >
              <Download size={16} />
              Exportar Lista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de linha da tabela de convidados
function GuestRow({
  guest,
  eventId,
  onUpdateStatus,
  onRemove,
}: {
  guest: GuestListEntry;
  eventId: string;
  onUpdateStatus: (eventId: string, guestId: string, status: GuestListEntry['status']) => void;
  onRemove: (eventId: string, guestId: string) => void;
}) {
  const statusConfig = {
    pending: { label: 'Pendente', color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
    confirmed: { label: 'Confirmado', color: 'text-neon-green', bg: 'bg-neon-green/20' },
    checked_in: { label: 'Check-in', color: 'text-neon-blue', bg: 'bg-neon-blue/20' },
    cancelled: { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-400/20' },
  };

  const config = statusConfig[guest.status];

  return (
    <tr className="border-t border-dark-600 hover:bg-dark-700/50">
      <td className="p-4">
        <p className="font-medium text-white">{guest.name}</p>
      </td>
      <td className="p-4">
        <p className="text-sm text-gray-400">{guest.phone || guest.email || '-'}</p>
      </td>
      <td className="p-4">
        <span className={`badge ${config.bg} ${config.color} text-xs`}>
          {config.label}
        </span>
      </td>
      <td className="p-4">
        <p className="text-sm text-gray-400">
          {format(new Date(guest.addedAt), 'dd/MM/yyyy')}
        </p>
      </td>
      <td className="p-4">
        <div className="flex items-center justify-end gap-2">
          {guest.status === 'pending' && (
            <button
              onClick={() => onUpdateStatus(eventId, guest.id, 'confirmed')}
              className="p-1.5 rounded text-neon-green hover:bg-neon-green/20 transition-colors"
              title="Confirmar"
            >
              <CheckCircle size={18} />
            </button>
          )}
          {guest.status === 'confirmed' && (
            <button
              onClick={() => onUpdateStatus(eventId, guest.id, 'checked_in')}
              className="p-1.5 rounded text-neon-blue hover:bg-neon-blue/20 transition-colors"
              title="Check-in"
            >
              <CheckCircle size={18} />
            </button>
          )}
          <button
            onClick={() => onRemove(eventId, guest.id)}
            className="p-1.5 rounded text-red-400 hover:bg-red-400/20 transition-colors"
            title="Remover"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}

