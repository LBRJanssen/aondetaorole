// ============================================
// HOOK PARA SINCRONIZAR AUTH E WALLET STORES
// ============================================

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';

/**
 * Hook que sincroniza o walletStore com o authStore
 * Quando o usuario faz login, carrega os dados da carteira dele
 * Quando o usuario faz logout, limpa os dados da carteira
 */
export function useAuthSync() {
  const { user, isAuthenticated } = useAuthStore();
  const { fetchBalance, fetchTransactions, clearWallet } = useWalletStore();
  const lastUserIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Na inicializacao, carrega os dados do usuario se houver
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (isAuthenticated && user) {
        lastUserIdRef.current = user.id;
        fetchBalance();
        fetchTransactions(1, true);
      } else if (!isAuthenticated) {
        lastUserIdRef.current = null;
        clearWallet();
      }
      return;
    }

    // Apos inicializacao, monitora mudancas
    if (isAuthenticated && user) {
      // Se o usuario mudou, atualiza a carteira
      if (lastUserIdRef.current !== user.id) {
        lastUserIdRef.current = user.id;
        fetchBalance();
        fetchTransactions(1, true);
      }
    } else {
      // Se nao esta autenticado, limpa a carteira
      if (lastUserIdRef.current !== null) {
        lastUserIdRef.current = null;
        clearWallet();
      }
    }
  }, [isAuthenticated, user?.id, fetchBalance, fetchTransactions, clearWallet]);
}

