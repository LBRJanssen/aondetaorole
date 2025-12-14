'use client';

import { Wallet, Plus } from 'lucide-react';
import { useWalletStore } from '@/store/walletStore';
import Link from 'next/link';

export default function WalletBalance() {
  const { wallet } = useWalletStore();

  const formatBalance = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const balance = wallet?.balance || 0;

  return (
    <Link
      href="/carteira"
      className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg transition-all group flex-shrink-0"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center flex-shrink-0">
        <Wallet size={16} className="text-white" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-gray-400 hidden lg:block leading-tight">Saldo</span>
        <span className="text-sm font-bold text-white group-hover:text-neon-green transition-colors truncate">
          {formatBalance(balance)}
        </span>
      </div>
      <Plus size={14} className="text-gray-400 group-hover:text-neon-green transition-colors flex-shrink-0 hidden lg:block" />
    </Link>
  );
}

