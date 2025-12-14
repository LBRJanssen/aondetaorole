'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, Download } from 'lucide-react';

interface Statistics {
  totalUsers: number;
  totalEvents: number;
  totalTransactions: number;
  activeEvents: number;
  premiumUsers: number;
  adminUsers: number;
}


export default function AdminStatistics() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<Statistics>({
    totalUsers: 0,
    totalEvents: 0,
    totalTransactions: 0,
    activeEvents: 0,
    premiumUsers: 0,
    adminUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setIsLoading(true);
    try {
      // Buscar estatísticas do banco
      const [usersResult, eventsResult, transactionsResult] = await Promise.all([
        supabase.from('user_profiles').select('id, user_type, is_premium', { count: 'exact' }),
        supabase.from('events').select('id, is_active', { count: 'exact' }),
        supabase.from('transactions').select('id', { count: 'exact' }),
      ]);

      const users = usersResult.data || [];
      const events = eventsResult.data || [];

      setStats({
        totalUsers: usersResult.count || 0,
        totalEvents: eventsResult.count || 0,
        totalTransactions: transactionsResult.count || 0,
        activeEvents: events.filter(e => e.is_active).length,
        premiumUsers: users.filter(u => u.is_premium || u.user_type === 'premium').length,
        adminUsers: users.filter(u => ['admin', 'owner', 'moderacao', 'suporte'].includes(u.user_type || '')).length,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      showToast('Erro ao carregar estatísticas.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    // TODO: Implementar exportação de relatórios
    showToast('Funcionalidade de exportação será implementada em breve.', 'info');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
                Estatísticas Gerais
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm">
                Visão geral da plataforma
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={18} />
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-blue-500/20 to-blue-700/20 border-blue-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total de Usuários</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <Users size={24} className="text-blue-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500/20 to-purple-700/20 border-purple-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total de Eventos</p>
              <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
            </div>
            <Calendar size={24} className="text-purple-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500/20 to-green-700/20 border-green-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Eventos Ativos</p>
              <p className="text-2xl font-bold text-white">{stats.activeEvents}</p>
            </div>
            <TrendingUp size={24} className="text-green-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 border-neon-pink/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Usuários Premium</p>
              <p className="text-2xl font-bold text-white">{stats.premiumUsers}</p>
            </div>
            <TrendingUp size={24} className="text-neon-pink" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500/20 to-red-700/20 border-red-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Usuários Administrativos</p>
              <p className="text-2xl font-bold text-white">{stats.adminUsers}</p>
            </div>
            <Users size={24} className="text-red-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-500/20 to-yellow-700/20 border-yellow-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total de Transações</p>
              <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
            </div>
            <DollarSign size={24} className="text-yellow-400" />
          </div>
        </div>
      </div>

    </div>
  );
}

