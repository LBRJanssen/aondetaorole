// ============================================
// WALLET STORE - Carteira Digital (Integrado com API)
// ============================================

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'purchase' | 'refund' | 'boost' | 'premium';
  typeLabel: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  statusLabel: string;
  createdAt: string;
  currency: string;
}

export interface WalletData {
  id: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface WalletState {
  // Data
  wallet: WalletData | null;
  transactions: Transaction[];
  pagination: PaginationData | null;
  
  // UI State
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  
  // Filters
  filterType: string | null;
  filterStatus: string | null;

  // Actions
  fetchBalance: () => Promise<void>;
  fetchTransactions: (page?: number, reset?: boolean) => Promise<void>;
  deposit: (amount: number, description?: string) => Promise<{ success: boolean; message: string }>;
  withdraw: (amount: number, pixKey: string, pixKeyType: string) => Promise<{ success: boolean; message: string }>;
  purchaseTicket: (eventId: string, eventName: string, price: number, categoryId?: string, categoryName?: string) => Promise<{ success: boolean; message: string }>;
  setFilterType: (type: string | null) => void;
  setFilterStatus: (status: string | null) => void;
  clearWallet: () => void;
}

// Helper para pegar token
const getAuthToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return null;
    }
    
    return session.access_token || null;
  } catch (error) {
    console.error('Erro ao obter token:', error);
    return null;
  }
};

export const useWalletStore = create<WalletState>()((set, get) => ({
  // Initial State
  wallet: null,
  transactions: [],
  pagination: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  filterType: null,
  filterStatus: null,

  // Busca saldo da carteira
  fetchBalance: async () => {
    const token = await getAuthToken();
    if (!token) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar saldo');
      }

      set({ 
        wallet: data.data,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('❌ [WalletStore] Erro ao buscar saldo:', error);
      set({ 
        error: error.message,
        isLoading: false 
      });
    }
  },

  // Busca histórico de transações
  fetchTransactions: async (page = 1, reset = false) => {
    const token = await getAuthToken();
    if (!token) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    const { filterType, filterStatus, transactions: currentTransactions } = get();
    
    set({ 
      isLoading: page === 1,
      isLoadingMore: page > 1,
      error: null 
    });

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);

      const response = await fetch(`/api/wallet/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar histórico');
      }

      set({ 
        transactions: reset || page === 1 
          ? data.data.transactions 
          : [...currentTransactions, ...data.data.transactions],
        pagination: data.data.pagination,
        isLoading: false,
        isLoadingMore: false
      });
    } catch (error: any) {
      console.error('❌ [WalletStore] Erro ao buscar histórico:', error);
      set({ 
        error: error.message,
        isLoading: false,
        isLoadingMore: false
      });
    }
  },

  // Depositar
  deposit: async (amount: number, description?: string) => {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: 'Usuário não autenticado' };
    }

    try {
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, description })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao depositar');
      }

      // Atualiza saldo e histórico
      await get().fetchBalance();
      await get().fetchTransactions(1, true);

      return { success: true, message: data.message || 'Depósito realizado com sucesso!' };
    } catch (error: any) {
      console.error('❌ [WalletStore] Erro ao depositar:', error);
      return { success: false, message: error.message };
    }
  },

  // Sacar
  withdraw: async (amount: number, pixKey: string, pixKeyType: string) => {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: 'Usuário não autenticado' };
    }

    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          amount, 
          pixKey,
          description: `Saque via PIX (${pixKeyType}: ${pixKey})`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sacar');
      }

      // Atualiza saldo e histórico
      await get().fetchBalance();
      await get().fetchTransactions(1, true);

      return { success: true, message: data.message || 'Saque solicitado com sucesso!' };
    } catch (error: any) {
      console.error('❌ [WalletStore] Erro ao sacar:', error);
      return { success: false, message: error.message };
    }
  },

  // Comprar ingresso
  purchaseTicket: async (eventId: string, eventName: string, price: number, categoryId?: string, categoryName?: string) => {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: 'Usuário não autenticado' };
    }

    try {
      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          eventId,
          categoryId,
          price
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao comprar ingresso');
      }

      // Atualiza saldo e histórico
      await get().fetchBalance();
      await get().fetchTransactions(1, true);

      return { success: true, message: data.message || 'Ingresso comprado com sucesso!' };
    } catch (error: any) {
      console.error('❌ [WalletStore] Erro ao comprar ingresso:', error);
      return { success: false, message: error.message };
    }
  },

  // Filtros
  setFilterType: (type: string | null) => {
    set({ filterType: type });
    get().fetchTransactions(1, true);
  },

  setFilterStatus: (status: string | null) => {
    set({ filterStatus: status });
    get().fetchTransactions(1, true);
  },

  // Limpar (logout)
  clearWallet: () => {
    set({
      wallet: null,
      transactions: [],
      pagination: null,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      filterType: null,
      filterStatus: null
    });
  }
}));
