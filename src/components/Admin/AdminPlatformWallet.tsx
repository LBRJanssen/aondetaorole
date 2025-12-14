'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Wallet, DollarSign, TrendingUp, Download, ArrowUpRight, ArrowDownRight, Calendar, Zap, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WalletInfo {
  id: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  revenue30Days: number;
  transactions30Days: number;
}

interface PlatformWalletData {
  boostWallet: WalletInfo;
  ticketWallet: WalletInfo;
  totalBalance: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  status: string;
  wallet_type?: 'boost' | 'ticket';
}

export default function AdminPlatformWallet() {
  const { showToast } = useToast();
  const [walletData, setWalletData] = useState<PlatformWalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedWallet, setSelectedWallet] = useState<'boost' | 'ticket' | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchWalletData();
    fetchTransactions();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filterType, dateRange, selectedWallet]);

  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      if (!token) {
        showToast('Você precisa estar logado', 'error');
        return;
      }

      const response = await fetch('/api/platform/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar dados da carteira');
      }

      setWalletData(data.data);
    } catch (error: any) {
      console.error('Erro ao buscar dados da carteira:', error);
      showToast(error.message || 'Erro ao buscar dados da carteira', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setIsLoadingTransactions(true);
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch('/api/platform/wallet', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page: currentPage,
          limit: 20,
          type: filterType !== 'all' ? filterType : undefined,
          startDate: dateRange.start,
          endDate: dateRange.end
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar transações');
      }

      setTransactions(data.data.transactions || []);
      setTotalPages(data.data.pagination?.totalPages || 1);
    } catch (error: any) {
      console.error('Erro ao buscar transações:', error);
      showToast(error.message || 'Erro ao buscar transações', 'error');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Depósito',
      withdraw: 'Saque',
      purchase: 'Compra',
      refund: 'Reembolso',
      boost: 'Boost',
      premium: 'Premium'
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    if (type === 'deposit') return 'text-green-400';
    if (type === 'withdraw') return 'text-red-400';
    return 'text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Wallet size={48} className="mx-auto text-gray-500 mb-4 animate-pulse" />
          <p className="text-gray-400">Carregando dados da carteira...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white mb-2">
          Carteira da Plataforma
        </h1>
        <p className="text-gray-400 text-sm">
          Gerencie o saldo e transações financeiras da plataforma
        </p>
      </div>

      {/* Cards de Resumo - Total */}
      {walletData && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-400 text-sm font-medium mb-1">Saldo Total das Carteiras</h3>
                <p className="text-3xl font-bold text-white font-mono">{formatCurrency(walletData.totalBalance)}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="text-green-400" size={32} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards das Carteiras Separadas */}
      {walletData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Carteira de Boost */}
          <div className="bg-dark-800 border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Zap className="text-purple-400" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Carteira de Boost</h3>
                  <p className="text-xs text-gray-400">100% do valor dos boosts</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm mb-1">Saldo Atual</p>
                <p className="text-2xl font-bold text-white font-mono">{formatCurrency(walletData.boostWallet.balance)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dark-600">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Receita (30d)</p>
                  <p className="text-lg font-semibold text-green-400 font-mono">{formatCurrency(walletData.boostWallet.revenue30Days)}</p>
                  <p className="text-xs text-gray-500">{walletData.boostWallet.transactions30Days} transações</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Total Depositado</p>
                  <p className="text-lg font-semibold text-white font-mono">{formatCurrency(walletData.boostWallet.totalDeposited)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Carteira de Ingressos */}
          <div className="bg-dark-800 border border-blue-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Ticket className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Carteira de Ingressos</h3>
                  <p className="text-xs text-gray-400">10% de comissão das vendas</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm mb-1">Saldo Atual</p>
                <p className="text-2xl font-bold text-white font-mono">{formatCurrency(walletData.ticketWallet.balance)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dark-600">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Comissões (30d)</p>
                  <p className="text-lg font-semibold text-green-400 font-mono">{formatCurrency(walletData.ticketWallet.revenue30Days)}</p>
                  <p className="text-xs text-gray-500">{walletData.ticketWallet.transactions30Days} transações</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Total Depositado</p>
                  <p className="text-lg font-semibold text-white font-mono">{formatCurrency(walletData.ticketWallet.totalDeposited)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro por Carteira */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Carteira</label>
            <select
              value={selectedWallet}
              onChange={(e) => {
                setSelectedWallet(e.target.value as 'boost' | 'ticket' | 'all');
                setCurrentPage(1);
              }}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
            >
              <option value="all">Todas as Carteiras</option>
              <option value="boost">Carteira de Boost</option>
              <option value="ticket">Carteira de Ingressos</option>
            </select>
          </div>

          {/* Data Início */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Data Início</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
            />
          </div>

          {/* Data Fim */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Data Fim</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
            />
          </div>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-dark-600">
          <h2 className="font-display font-bold text-lg text-white">Histórico de Transações</h2>
        </div>

        {isLoadingTransactions ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">Carregando transações...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">Nenhuma transação encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Valor</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Saldo Após</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-600">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-dark-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-300">{formatDate(transaction.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                            {getTransactionTypeLabel(transaction.type)}
                          </span>
                          {transaction.wallet_type && (
                            <span className="text-xs text-gray-500">
                              {transaction.wallet_type === 'boost' ? 'Carteira Boost' : 'Carteira Ingressos'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{transaction.description}</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.type === 'deposit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {formatCurrency(transaction.balance_after)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400' 
                            : transaction.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {transaction.status === 'completed' ? 'Concluída' : transaction.status === 'pending' ? 'Pendente' : 'Falhou'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-dark-600 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-gray-400 text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600 transition-colors"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}



