'use client';

import { useState, useEffect } from 'react';
import { useEventStore } from '@/store/eventStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmModal } from '@/components/UI/ConfirmModal';
import { getErrorMessage } from '@/utils/errorMessages';
import { Trash2, Search, AlertCircle, CheckCircle, Loader, CheckSquare, Square, Calendar, MapPin, Users, PartyPopper, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminEvents() {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { events, fetchEvents, deleteEvent, deleteMultipleEvents, isLoading } = useEventStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    eventId: string | null;
    type: 'single' | 'multiple';
  }>({
    isOpen: false,
    eventId: null,
    type: 'single',
  });

  // Carrega eventos
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = (eventId: string) => {
    setConfirmModal({
      isOpen: true,
      eventId,
      type: 'single',
    });
  };

  const confirmDelete = async () => {
    if (!confirmModal.eventId) return;

    setDeletingId(confirmModal.eventId);
    setConfirmModal({ isOpen: false, eventId: null, type: 'single' });

    try {
      await deleteEvent(confirmModal.eventId, user?.id, true);
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(confirmModal.eventId!);
        return newSet;
      });
      await fetchEvents();
      showToast('Evento deletado com sucesso!', 'success');
    } catch (error: any) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleSelect = (eventId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredEvents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEvents.map((e) => e.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      showToast('Selecione pelo menos uma festa para deletar.', 'warning');
      return;
    }

    setConfirmModal({
      isOpen: true,
      eventId: null,
      type: 'multiple',
    });
  };

  const confirmDeleteMultiple = async () => {
    const count = selectedIds.size;
    setConfirmModal({ isOpen: false, eventId: null, type: 'multiple' });
    setIsDeletingMultiple(true);

    try {
      await deleteMultipleEvents(Array.from(selectedIds), user?.id, true);
      setSelectedIds(new Set());
      await fetchEvents();
      showToast(`${count} festa(s) deletada(s) com sucesso!`, 'success');
    } catch (error: any) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  // Filtra eventos pela busca
  const filteredEvents = events.filter((event) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.name.toLowerCase().includes(query) ||
      event.address.toLowerCase().includes(query) ||
      event.organizerName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 flex items-center justify-center">
          <PartyPopper size={28} className="text-neon-pink" />
        </div>
          <div>
          <h1 className="font-display font-bold text-2xl text-white">
              Gerenciar Eventos
            </h1>
          <p className="text-gray-400 text-sm">
            Visualize e gerencie todas as festas cadastradas
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-5 border border-neon-pink/20 hover:border-neon-pink/40 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neon-pink/20 flex items-center justify-center">
              <PartyPopper size={24} className="text-neon-pink" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total de Festas</p>
              <p className="text-3xl font-bold text-white">{events.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-5 border border-neon-green/20 hover:border-neon-green/40 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neon-green/20 flex items-center justify-center">
              <CheckCircle size={24} className="text-neon-green" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Festas Ativas</p>
              <p className="text-3xl font-bold text-white">
                {events.filter((e) => e.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-5 border border-neon-blue/20 hover:border-neon-blue/40 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neon-blue/20 flex items-center justify-center">
              <Search size={24} className="text-neon-blue" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Resultados</p>
              <p className="text-3xl font-bold text-white">{filteredEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Área de Busca */}
      <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-4 border border-dark-600">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, endereço ou organizador..."
            className="w-full pl-12 pr-12 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:border-neon-pink focus:outline-none focus:ring-2 focus:ring-neon-pink/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-400">
            Mostrando <span className="text-neon-pink font-semibold">{filteredEvents.length}</span> resultado(s) para "<span className="text-white">{searchQuery}</span>"
          </p>
        )}
      </div>

      {/* Lista de Festas */}
      <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-600 overflow-hidden">
        {/* Header da Lista */}
        <div className="p-4 border-b border-dark-600 bg-dark-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-lg text-white">
                Festas Cadastradas
          </h2>
              <span className="px-2 py-1 bg-dark-600 rounded-lg text-xs text-gray-400">
                {filteredEvents.length}
              </span>
            </div>
            
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeletingMultiple}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-medium shadow-lg shadow-red-500/20"
              >
                {isDeletingMultiple ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Deletando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Deletar {selectedIds.size} selecionada(s)
                  </>
                )}
              </button>
          )}
        </div>

          {/* Selecionar Todas */}
        {filteredEvents.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="mt-3 flex items-center gap-2 text-sm text-gray-400 hover:text-neon-pink transition-colors"
            >
              {selectedIds.size === filteredEvents.length ? (
                <>
                  <CheckSquare size={18} className="text-neon-pink" />
                  <span>Desmarcar todas</span>
                </>
              ) : (
                <>
                  <Square size={18} />
                  <span>Selecionar todas ({filteredEvents.length})</span>
                </>
              )}
            </button>
          )}
          </div>

        {/* Conteúdo */}
        <div className="p-4">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader size={40} className="animate-spin text-neon-pink mb-4" />
              <p className="text-gray-400">Carregando festas...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
                <AlertCircle size={40} className="text-gray-500" />
              </div>
              <p className="text-gray-400 text-lg mb-2">
                {searchQuery ? 'Nenhuma festa encontrada' : 'Nenhuma festa cadastrada'}
            </p>
              {searchQuery && (
                <p className="text-gray-500 text-sm">
                  Tente buscar com outros termos
                </p>
              )}
          </div>
        ) : (
            <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                  className={`group p-4 rounded-xl border transition-all duration-200 ${
                  selectedIds.has(event.id)
                      ? 'bg-red-500/10 border-red-500/50'
                      : 'bg-dark-700/50 border-dark-600 hover:border-neon-pink/30 hover:bg-dark-700'
                }`}
              >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleSelect(event.id)}
                      className="mt-1 flex-shrink-0 transition-transform hover:scale-110"
                    >
                      {selectedIds.has(event.id) ? (
                        <CheckSquare size={20} className="text-red-400" />
                      ) : (
                        <Square size={20} className="text-gray-500 group-hover:text-gray-400" />
                      )}
                    </button>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-display font-bold text-lg text-white truncate">
                          {event.name}
                        </h3>
                        {!event.isActive && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                            Inativa
                          </span>
                        )}
                        {event.isPremiumOrganizer && (
                          <span className="px-2 py-0.5 bg-neon-purple/20 text-neon-purple text-xs rounded-full">
                            Premium
                          </span>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-gray-400 mb-3 line-clamp-1">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <MapPin size={14} className="text-neon-pink" />
                          <span className="truncate max-w-[200px]">{event.address.split(',')[0]}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Users size={14} className="text-neon-blue" />
                          {event.organizerName}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Calendar size={14} className="text-neon-green" />
                          {format(new Date(event.startDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Users size={14} className="text-neon-purple" />
                          {event.currentAttendees} / {event.maxCapacity}
                        </span>
                      </div>
                    </div>
                    
                    {/* Ações */}
                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={deletingId === event.id}
                      className="flex-shrink-0 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {deletingId === event.id ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                      <span className="hidden sm:inline">Deletar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.type === 'multiple'
            ? `Deletar ${selectedIds.size} Festa(s)?`
            : 'Deletar Festa?'
        }
        message={
          confirmModal.type === 'multiple'
            ? `Tem certeza que deseja deletar ${selectedIds.size} festa(s)? Esta ação não pode ser desfeita.`
            : 'Tem certeza que deseja deletar esta festa? Esta ação não pode ser desfeita.'
        }
        confirmText="Deletar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmModal.type === 'multiple' ? confirmDeleteMultiple : confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, eventId: null, type: 'single' })}
      />
    </div>
  );
}

