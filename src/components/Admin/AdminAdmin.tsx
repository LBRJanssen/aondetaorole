'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmModal } from '@/components/UI/ConfirmModal';
import { getErrorMessage } from '@/utils/errorMessages';
import { useAuthStore } from '@/store/authStore';
import { Shield, Search, User, Ban, History, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  user_type: 'common' | 'premium' | 'admin' | 'owner' | 'moderacao' | 'suporte' | 'financeiro';
  is_premium: boolean;
  is_banned?: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  created_at: string;
  updated_at: string;
}

interface UserAction {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function AdminAdmin() {
  const { showToast } = useToast();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBanSectionExpanded, setIsBanSectionExpanded] = useState(false);
  const [selectedUserToBan, setSelectedUserToBan] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');
  const [userHistory, setUserHistory] = useState<UserAction[]>([]);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<UserProfile | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Verifica se o usuário pode banir (owner, admin, moderacao - MAS NÃO financeiro)
  const canBanUsers = currentUser?.userType === 'owner' || 
                      currentUser?.userType === 'admin' || 
                      currentUser?.userType === 'moderacao';
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
    action: 'ban' | 'unban';
  }>({
    isOpen: false,
    userId: null,
    userName: '',
    action: 'ban',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        showToast(getErrorMessage(error), 'error');
        return;
      }

      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserHistory = async (userId: string) => {
    setIsLoadingHistory(true);
    try {
      // TODO: Implementar tabela de histórico de ações no banco
      // Por enquanto, simula histórico baseado em eventos e transações
      const [eventsResult, transactionsResult] = await Promise.all([
        supabase
          .from('events')
          .select('id, name, created_at, updated_at')
          .eq('organizer_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('transactions')
          .select('id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const actions: UserAction[] = [];

      // Adiciona ações de eventos
      if (eventsResult.data) {
        eventsResult.data.forEach((event) => {
          actions.push({
            id: `event-${event.id}`,
            userId,
            userName: selectedUserForHistory?.name || '',
            action: 'Criou evento',
            details: event.name,
            timestamp: event.created_at,
          });
          if (event.updated_at && event.updated_at !== event.created_at) {
            actions.push({
              id: `event-update-${event.id}`,
              userId,
              userName: selectedUserForHistory?.name || '',
              action: 'Editou evento',
              details: event.name,
              timestamp: event.updated_at,
            });
          }
        });
      }

      // Adiciona ações de transações
      if (transactionsResult.data) {
        transactionsResult.data.forEach((transaction) => {
          actions.push({
            id: `transaction-${transaction.id}`,
            userId,
            userName: selectedUserForHistory?.name || '',
            action: 'Realizou transação',
            details: `Transação #${transaction.id.substring(0, 8)}`,
            timestamp: transaction.created_at,
          });
        });
      }

      // Ordena por data (mais recente primeiro)
      actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setUserHistory(actions.slice(0, 20)); // Limita a 20 ações mais recentes
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      showToast('Erro ao carregar histórico do usuário.', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleBanUser = (user: UserProfile) => {
    setSelectedUserToBan(user);
    setIsBanSectionExpanded(true);
  };

  const confirmBan = async () => {
    if (!confirmModal.userId) return;

    const isUnban = confirmModal.action === 'unban';

    try {
      const updateData = isUnban
        ? {
            is_banned: false,
            banned_at: null,
            ban_reason: null,
          }
        : {
            is_banned: true,
            banned_at: new Date().toISOString(),
            ban_reason: banReason || null,
          };

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', confirmModal.userId);

      if (error) {
        showToast(isUnban ? 'Erro ao desbanir usuário.' : 'Erro ao banir usuário.', 'error');
        return;
      }

      showToast(
        isUnban
          ? `Usuário ${confirmModal.userName} foi desbanido com sucesso.`
          : `Usuário ${confirmModal.userName} foi banido permanentemente.`,
        'success'
      );
      setConfirmModal({ isOpen: false, userId: null, userName: '', action: 'ban' });
      setSelectedUserToBan(null);
      setBanReason('');
      setIsBanSectionExpanded(false);
      await fetchUsers();
    } catch (error: any) {
      console.error('Erro ao banir/desbanir usuário:', error);
      showToast(isUnban ? 'Erro ao desbanir usuário.' : 'Erro ao banir usuário.', 'error');
    }
  };

  const handleViewHistory = async (user: UserProfile) => {
    setSelectedUserForHistory(user);
    await fetchUserHistory(user.id);
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.phone && user.phone.toLowerCase().includes(query)) ||
      user.id.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
              Painel Admin
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm">
              Funcionalidades administrativas exclusivas
            </p>
          </div>
        </div>
      </div>

      {/* Seção: Banir Usuários - Apenas para owner, admin e moderacao (NÃO financeiro) */}
      {canBanUsers && (
        <div className="card mb-6">
        <button
          onClick={() => setIsBanSectionExpanded(!isBanSectionExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-dark-700/50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <Ban size={20} className="text-red-400" />
            <h2 className="font-display font-bold text-lg text-white">
              Banir Usuários
            </h2>
          </div>
          {isBanSectionExpanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </button>

        {isBanSectionExpanded && (
          <div className="pt-4 border-t border-dark-600 space-y-4">
            {/* Busca */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                <Search
                  size={20}
                  className="text-gray-500"
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, email, telefone ou ID..."
                className="input-field pl-12 pr-4 w-full bg-dark-800/50 border-dark-600 text-white placeholder-gray-500 
                           focus:border-red-500 focus:ring-2 focus:ring-red-500/50 focus:bg-dark-800
                           hover:border-red-500/50 transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 
                             text-gray-400 hover:text-red-400 transition-colors duration-300
                             p-1 rounded-full hover:bg-dark-700"
                  aria-label="Limpar busca"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Lista de Usuários para Banir */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Carregando usuários...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">
                  {searchQuery ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredUsers
                  .filter(user => user.user_type !== 'owner') // Owner não pode ser banido
                  .map((user) => {
                    const isBanned = user.is_banned === true;
                    return (
                      <div
                        key={user.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          isBanned
                            ? 'bg-red-500/10 border-red-500/50 hover:border-red-500'
                            : 'bg-dark-700 border-dark-600 hover:border-red-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-display font-bold text-base text-white truncate">
                                {user.name}
                              </h3>
                              <span className="px-2 py-1 text-xs rounded bg-gray-500/20 text-gray-400">
                                {user.user_type}
                              </span>
                              {isBanned && (
                                <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/50 flex items-center gap-1">
                                  <Ban size={12} />
                                  Banido
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 text-xs text-gray-500">
                              <span className="truncate">📧 {user.email}</span>
                              {user.phone && <span className="truncate">📞 {user.phone}</span>}
                              <span className="truncate">🆔 {user.id.substring(0, 8)}...</span>
                              {isBanned && user.banned_at && (
                                <span className="truncate">
                                  🚫 Banido em {format(new Date(user.banned_at), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                              )}
                              {isBanned && user.ban_reason && (
                                <span className="truncate" title={user.ban_reason}>
                                  📝 {user.ban_reason}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedUserToBan(user);
                              setConfirmModal({
                                isOpen: true,
                                userId: user.id,
                                userName: user.name,
                                action: isBanned ? 'unban' : 'ban',
                              });
                            }}
                            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0 ml-4 ${
                              isBanned
                                ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 hover:border-green-500 text-green-400'
                                : 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500 text-red-400'
                            }`}
                          >
                            <Ban size={16} />
                            <span className="text-sm">{isBanned ? 'Desbanir' : 'Banir'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Motivo do Ban (quando usuário selecionado) */}
            {selectedUserToBan && (
              <div className="pt-4 border-t border-dark-600">
                <label className="input-label mb-2 block">
                  Motivo do Ban (opcional)
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Descreva o motivo do banimento..."
                  className="input-field w-full min-h-[100px] bg-dark-800/50 border-dark-600 text-white placeholder-gray-500 
                             focus:border-red-500 focus:ring-2 focus:ring-red-500/50 focus:bg-dark-800
                             hover:border-red-500/50 transition-all duration-300"
                />
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Seção: Histórico de Ações dos Usuários */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <History size={20} className="text-blue-400" />
          <h2 className="font-display font-bold text-lg text-white">
            Histórico de Ações dos Usuários
          </h2>
        </div>

        {/* Seleção de Usuário */}
        <div className="mb-4">
          <label className="input-label mb-2 block">Selecione um usuário para ver o histórico</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
              <User size={20} className="text-gray-500" />
            </div>
            <select
              value={selectedUserForHistory?.id || ''}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value);
                if (user) {
                  handleViewHistory(user);
                }
              }}
              className="input-field pl-12 pr-4 w-full bg-dark-800/50 border-dark-600 text-white 
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-dark-800
                         hover:border-blue-500/50 transition-all duration-300"
            >
              <option value="">Selecione um usuário...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Histórico */}
        {selectedUserForHistory && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base text-white">
                Histórico de: {selectedUserForHistory.name}
              </h3>
              <button
                onClick={() => {
                  setSelectedUserForHistory(null);
                  setUserHistory([]);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Carregando histórico...</p>
              </div>
            ) : userHistory.length === 0 ? (
              <div className="text-center py-12">
                <History size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">Nenhuma ação registrada para este usuário.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {userHistory.map((action) => (
                  <div
                    key={action.id}
                    className="p-4 bg-dark-700 rounded-lg border border-dark-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle size={16} className="text-blue-400 flex-shrink-0" />
                          <span className="font-medium text-white">{action.action}</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{action.details}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(action.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedUserForHistory && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              Selecione um usuário acima para visualizar seu histórico de ações.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Ban */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.action === 'ban' ? 'Banir Usuário Permanentemente?' : 'Remover Banimento do Usuário?'}
        message={
          confirmModal.action === 'ban'
            ? `Tem certeza que deseja banir permanentemente o usuário "${confirmModal.userName}"? Esta ação não pode ser desfeita e o usuário perderá acesso total à plataforma.${banReason ? `\n\nMotivo: ${banReason}` : ''}`
            : `Tem certeza que deseja remover o banimento do usuário "${confirmModal.userName}"? O usuário recuperará acesso total à plataforma.`
        }
        confirmText={confirmModal.action === 'ban' ? 'Banir Permanentemente' : 'Desbanir Usuário'}
        cancelText="Cancelar"
        variant={confirmModal.action === 'ban' ? 'danger' : 'default'}
        onConfirm={confirmBan}
        onCancel={() => {
          setConfirmModal({ isOpen: false, userId: null, userName: '', action: 'ban' });
          setSelectedUserToBan(null);
          setBanReason('');
        }}
      />
    </div>
  );
}

