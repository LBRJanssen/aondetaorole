'use client';

import { useState, useEffect } from 'react';
import { useEventStore } from '@/store/eventStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { 
  RefreshCw, 
  Search, 
  Loader2, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  ArrowRight,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MigrationStats {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
}

export default function AdminMigrateEvents() {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { events, fetchEvents, isLoading } = useEventStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [targetOrganizerId, setTargetOrganizerId] = useState('');
  const [targetOrganizerName, setTargetOrganizerName] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStats, setMigrationStats] = useState<MigrationStats | null>(null);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);

  // Carrega eventos
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filtra eventos
  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.organizerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addLog = (message: string) => {
    setMigrationLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const verifyOrganizer = async (organizerId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .eq('id', organizerId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Organizador não encontrado');

      setTargetOrganizerName(data.name);
      return data;
    } catch (error: any) {
      showToast(`Erro ao verificar organizador: ${error.message}`, 'error');
      return null;
    }
  };

  const handleVerifyOrganizer = async () => {
    if (!targetOrganizerId.trim()) {
      showToast('Digite o ID do organizador', 'warning');
      return;
    }

    const organizer = await verifyOrganizer(targetOrganizerId.trim());
    if (organizer) {
      showToast(`Organizador encontrado: ${organizer.name}`, 'success');
    }
  };

  const migrateEvent = async (eventId: string, newOrganizerId: string) => {
    try {
      addLog(`Iniciando migração do evento ${eventId}...`);

      // Busca o evento atual
      const event = events.find((e) => e.id === eventId);
      if (!event) {
        throw new Error('Evento não encontrado');
      }

      addLog(`Evento encontrado: ${event.name}`);

      // Atualiza o organizador do evento
      const { data, error } = await supabase
        .from('events')
        .update({
          organizer_id: newOrganizerId,
          organizer_name: targetOrganizerName || 'Migrado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      addLog(`✅ Evento migrado com sucesso para ${targetOrganizerName}`);
      return { success: true, eventId };
    } catch (error: any) {
      addLog(`❌ Erro ao migrar evento: ${error.message}`);
      return { success: false, eventId, error: error.message };
    }
  };

  const handleMigrateSingle = async () => {
    if (!selectedEventId) {
      showToast('Selecione um evento para migrar', 'warning');
      return;
    }

    if (!targetOrganizerId.trim()) {
      showToast('Digite o ID do organizador de destino', 'warning');
      return;
    }

    // Verifica organizador primeiro
    const organizer = await verifyOrganizer(targetOrganizerId.trim());
    if (!organizer) return;

    setIsMigrating(true);
    setMigrationLog([]);
    addLog('=== Iniciando migração de evento ===');

    const result = await migrateEvent(selectedEventId, targetOrganizerId.trim());

    if (result.success) {
      showToast('Evento migrado com sucesso!', 'success');
      setMigrationStats({
        total: 1,
        migrated: 1,
        failed: 0,
        skipped: 0,
      });
      await fetchEvents();
      setSelectedEventId(null);
    } else {
      showToast('Erro ao migrar evento', 'error');
      setMigrationStats({
        total: 1,
        migrated: 0,
        failed: 1,
        skipped: 0,
      });
    }

    setIsMigrating(false);
  };

  const handleMigrateMultiple = async (eventIds: string[]) => {
    if (eventIds.length === 0) {
      showToast('Selecione pelo menos um evento', 'warning');
      return;
    }

    if (!targetOrganizerId.trim()) {
      showToast('Digite o ID do organizador de destino', 'warning');
      return;
    }

    // Verifica organizador primeiro
    const organizer = await verifyOrganizer(targetOrganizerId.trim());
    if (!organizer) return;

    setIsMigrating(true);
    setMigrationLog([]);
    setMigrationStats({
      total: eventIds.length,
      migrated: 0,
      failed: 0,
      skipped: 0,
    });

    addLog(`=== Iniciando migração de ${eventIds.length} eventos ===`);

    let migrated = 0;
    let failed = 0;

    for (const eventId of eventIds) {
      const result = await migrateEvent(eventId, targetOrganizerId.trim());
      if (result.success) {
        migrated++;
      } else {
        failed++;
      }
    }

    setMigrationStats({
      total: eventIds.length,
      migrated,
      failed,
      skipped: 0,
    });

    addLog(`=== Migração concluída: ${migrated} sucesso, ${failed} falhas ===`);

    if (migrated > 0) {
      showToast(`${migrated} evento(s) migrado(s) com sucesso!`, 'success');
      await fetchEvents();
    }

    if (failed > 0) {
      showToast(`${failed} evento(s) falharam na migração`, 'error');
    }

    setIsMigrating(false);
  };

  const formatEventDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <RefreshCw size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
              Migrar Festas
            </h1>
            <p className="text-gray-400 text-sm">
              Transfira eventos de um organizador para outro
            </p>
          </div>
        </div>
      </div>

      {/* Aviso de Segurança */}
      <div className="card bg-yellow-500/5 border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-400 mb-1">Atenção</h3>
            <p className="text-sm text-gray-400">
              Esta operação altera permanentemente o organizador dos eventos. 
              Certifique-se de que o ID do organizador de destino está correto antes de prosseguir.
            </p>
          </div>
        </div>
      </div>

      {/* Configuração de Migração */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Database size={20} className="text-neon-blue" />
          <h2 className="font-display font-bold text-lg text-white">Configuração</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="input-label mb-2 block">ID do Organizador de Destino</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetOrganizerId}
                onChange={(e) => setTargetOrganizerId(e.target.value)}
                placeholder="Digite o UUID do organizador"
                className="input-field flex-1"
                disabled={isMigrating}
              />
              <button
                onClick={handleVerifyOrganizer}
                disabled={isMigrating || !targetOrganizerId.trim()}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 hover:text-white transition-all disabled:opacity-50"
              >
                Verificar
              </button>
            </div>
            {targetOrganizerName && (
              <p className="text-sm text-neon-green mt-2 flex items-center gap-2">
                <CheckCircle size={16} />
                Organizador: {targetOrganizerName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Busca de Eventos */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Search size={20} className="text-neon-purple" />
          <h2 className="font-display font-bold text-lg text-white">Selecionar Eventos</h2>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, endereço ou organizador..."
            className="input-field w-full"
          />
        </div>

        {/* Lista de Eventos */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-neon-blue animate-spin" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum evento encontrado</p>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedEventId === event.id
                    ? 'border-neon-pink bg-neon-pink/10'
                    : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                }`}
                onClick={() => !isMigrating && setSelectedEventId(event.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} className="text-neon-blue" />
                      <h3 className="font-semibold text-white">{event.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <User size={14} />
                      <span>Organizador atual: {event.organizerName}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatEventDate(event.startDate)} • {event.address}
                    </p>
                  </div>
                  {selectedEventId === event.id && (
                    <CheckCircle size={20} className="text-neon-pink flex-shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botão de Migração */}
        {selectedEventId && (
          <div className="mt-4 pt-4 border-t border-dark-600">
            <button
              onClick={handleMigrateSingle}
              disabled={isMigrating || !targetOrganizerId.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMigrating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Migrando...
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  Migrar Evento Selecionado
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Estatísticas de Migração */}
      {migrationStats && (
        <div className="card">
          <h2 className="font-display font-bold text-lg text-white mb-4">Estatísticas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-dark-800 rounded-lg">
              <p className="text-2xl font-bold text-white">{migrationStats.total}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
            <div className="text-center p-4 bg-neon-green/10 border border-neon-green/50 rounded-lg">
              <p className="text-2xl font-bold text-neon-green">{migrationStats.migrated}</p>
              <p className="text-xs text-gray-400">Migrados</p>
            </div>
            <div className="text-center p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-2xl font-bold text-red-400">{migrationStats.failed}</p>
              <p className="text-xs text-gray-400">Falhas</p>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-400">{migrationStats.skipped}</p>
              <p className="text-xs text-gray-400">Ignorados</p>
            </div>
          </div>
        </div>
      )}

      {/* Log de Migração */}
      {migrationLog.length > 0 && (
        <div className="card">
          <h2 className="font-display font-bold text-lg text-white mb-4">Log de Migração</h2>
          <div className="bg-dark-900 border border-dark-600 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="space-y-1 font-mono text-sm">
              {migrationLog.map((log, index) => (
                <div
                  key={index}
                  className={`${
                    log.includes('✅') ? 'text-neon-green' :
                    log.includes('❌') ? 'text-red-400' :
                    'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

