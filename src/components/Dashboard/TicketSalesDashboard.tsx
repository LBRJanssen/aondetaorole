'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Ticket, TrendingUp, BarChart3, DollarSign, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TicketSalesData {
  totalSales: number;
  totalTickets: number;
  averageTicket: number;
  platformCommission: number;
  transferredToOrganizer: number;
  withBoost: {
    sales: number;
    tickets: number;
    averageTicket: number;
  };
  withoutBoost: {
    sales: number;
    tickets: number;
    averageTicket: number;
  };
  eventsWithSales: number;
  period: {
    start: string;
    end: string;
  };
}

export default function TicketSalesDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState<TicketSalesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      if (!token) {
        showToast('Você precisa estar logado', 'error');
        return;
      }

      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end
      });

      const response = await fetch(`/api/organizer/ticket-sales?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar dados de vendas');
      }

      setData(result.data);
    } catch (error: any) {
      console.error('Erro ao buscar dados de vendas:', error);
      showToast(error.message || 'Erro ao buscar dados de vendas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleFilter = () => {
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Ticket size={48} className="mx-auto text-gray-500 mb-4 animate-pulse" />
          <p className="text-gray-400">Carregando dados de vendas...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-400">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-2">
            Vendas de Ingressos
          </h1>
          <p className="text-gray-400 text-sm">
            Relatório detalhado de vendas de ingressos
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
          />
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg font-medium transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* VENDAS TOTAIS */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="text-green-400" size={24} />
            </div>
          </div>
          <h3 className="text-gray-300 text-sm font-medium mb-2">VENDAS TOTAIS</h3>
          <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(data.totalSales)}</p>
          <p className="text-xs text-gray-400">{data.totalTickets} ingressos vendidos</p>
        </div>

        {/* TICKET MÉDIO */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="text-blue-400" size={24} />
            </div>
          </div>
          <h3 className="text-gray-300 text-sm font-medium mb-2">TICKET MÉDIO</h3>
          <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(data.averageTicket)}</p>
          <p className="text-xs text-gray-400">Por ingresso</p>
        </div>

        {/* COMISSÃO PLATAFORMA */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Ticket className="text-purple-400" size={24} />
            </div>
          </div>
          <h3 className="text-gray-300 text-sm font-medium mb-2">COMISSÃO PLATAFORMA</h3>
          <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(data.platformCommission)}</p>
          <p className="text-xs text-gray-400">10% do total</p>
        </div>

        {/* REPASSADO */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <BarChart3 className="text-yellow-400" size={24} />
            </div>
          </div>
          <h3 className="text-gray-300 text-sm font-medium mb-2">REPASSADO</h3>
          <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(data.transferredToOrganizer)}</p>
          <p className="text-xs text-gray-400">Para organizadores</p>
        </div>
      </div>

      {/* Eventos com Boost vs Sem Boost */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
        <h2 className="font-display font-bold text-lg text-white mb-6">Eventos com Boost vs Sem Boost</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Com Boost */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="text-green-400" size={24} />
              </div>
              <h3 className="text-white font-semibold text-lg">Com Boost</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Vendas</p>
                <p className="text-2xl font-bold text-white font-mono">{formatCurrency(data.withBoost.sales)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Ingressos</p>
                <p className="text-xl font-bold text-white font-mono">{data.withBoost.tickets}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Ticket Médio</p>
                <p className="text-xl font-bold text-green-400 font-mono">{formatCurrency(data.withBoost.averageTicket)}</p>
              </div>
            </div>
          </div>

          {/* Sem Boost */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <BarChart3 className="text-yellow-400" size={24} />
              </div>
              <h3 className="text-white font-semibold text-lg">Sem Boost</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Vendas</p>
                <p className="text-2xl font-bold text-white font-mono">{formatCurrency(data.withoutBoost.sales)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Ingressos</p>
                <p className="text-xl font-bold text-white font-mono">{data.withoutBoost.tickets}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Ticket Médio</p>
                <p className="text-xl font-bold text-yellow-400 font-mono">{formatCurrency(data.withoutBoost.averageTicket)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Total de eventos com vendas */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
        <p className="text-gray-400 text-sm">
          Total de eventos com vendas: <span className="text-white font-semibold">{data.eventsWithSales}</span>
        </p>
      </div>
    </div>
  );
}


