'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/contexts/ToastContext';
import {
  Flame,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  Zap,
  Crown,
  BarChart3,
  Loader2,
  ArrowUp,
  ArrowDown,
  Target,
  Ticket,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BoostProfit {
  boostId: string;
  boostType: string;
  startedAt: string;
  expiresAt: string;
  price: number;
  ticketSales: number;
  profit: number;
  ticketCount: number;
}

interface EventProfit {
  eventId: string;
  eventName: string;
  boosts: BoostProfit[];
  totalBoosts: number;
  totalProfit: number;
  totalTicketSales: number;
  totalTicketCount: number;
  totalBoostCost: number;
  roi: number;
}

interface ProfitSummary {
  totalProfit: number;
  totalBoostCost: number;
  totalTicketSales: number;
  overallROI: number;
  totalEvents: number;
  commissionPercent: number;
}

export default function MeusBoostsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'purchased' | 'profit'>('profit');
  const [isLoading, setIsLoading] = useState(true);
  const [profitData, setProfitData] = useState<EventProfit[]>([]);
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [purchasedBoosts, setPurchasedBoosts] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfitData();
      fetchPurchasedBoosts();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            return parsed.access_token || null;
          }
        } catch {
          continue;
        }
      }
    }
    return null;
  };

  const fetchProfitData = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        showToast('Você precisa estar logado', 'error');
        return;
      }

      const response = await fetch('/api/boost/profit', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setProfitData(data.data.events);
        setSummary(data.data.summary);
      }
    } catch (error: any) {
      console.error('Erro ao buscar lucro:', error);
      showToast('Erro ao carregar dados de lucro', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPurchasedBoosts = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      // Buscar boosts comprados pelo usuário
      // TODO: Criar API específica para isso ou usar a API de profit
    } catch (error) {
      console.error('Erro ao buscar boosts comprados:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expirado';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} dia(s) restante(s)`;
    }
    return `${hours}h ${minutes}m restantes`;
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Acesso Restrito</h2>
            <p className="text-gray-400">Faça login para ver seus boosts</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Flame size={32} className="text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-3xl text-white mb-1">
                  Meus Boosts
                </h1>
                <p className="text-gray-400">
                  Gerencie seus boosts e acompanhe seu lucro
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-dark-600">
              <button
                onClick={() => setActiveTab('profit')}
                className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'profit'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign size={20} />
                  <span>Lucro por Boost</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('purchased')}
                className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'purchased'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap size={20} />
                  <span>Boosts Comprados</span>
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={48} className="animate-spin text-orange-400" />
            </div>
          ) : activeTab === 'profit' ? (
            <>
              {/* Summary Cards */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign size={24} className="text-neon-green" />
                      <span className="text-gray-400 text-sm">Lucro Total</span>
                    </div>
                    <p className="text-3xl font-display font-bold text-neon-green">
                      {formatCurrency(summary.totalProfit)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summary.commissionPercent}% de comissão sobre vendas
                    </p>
                  </div>

                  <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
                    <div className="flex items-center gap-3 mb-2">
                      <Flame size={24} className="text-orange-400" />
                      <span className="text-gray-400 text-sm">Investido em Boosts</span>
                    </div>
                    <p className="text-3xl font-display font-bold text-orange-400">
                      {formatCurrency(summary.totalBoostCost)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {profitData.reduce((sum, e) => sum + e.totalBoosts, 0)} boosts ativos
                    </p>
                  </div>

                  <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp size={24} className="text-neon-blue" />
                      <span className="text-gray-400 text-sm">ROI</span>
                    </div>
                    <p className={`text-3xl font-display font-bold ${
                      summary.overallROI >= 0 ? 'text-neon-green' : 'text-red-400'
                    }`}>
                      {summary.overallROI >= 0 ? '+' : ''}{summary.overallROI.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Retorno sobre investimento
                    </p>
                  </div>

                  <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
                    <div className="flex items-center gap-3 mb-2">
                      <Ticket size={24} className="text-neon-pink" />
                      <span className="text-gray-400 text-sm">Vendas Totais</span>
                    </div>
                    <p className="text-3xl font-display font-bold text-neon-pink">
                      {formatCurrency(summary.totalTicketSales)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {profitData.reduce((sum, e) => sum + e.totalTicketCount, 0)} ingressos vendidos
                    </p>
                  </div>
                </div>
              )}

              {/* Events List */}
              {profitData.length === 0 ? (
                <div className="bg-dark-800 rounded-xl p-12 text-center border border-dark-600">
                  <Flame size={64} className="mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    Nenhum boost ativo
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Você ainda não tem boosts ativos nos seus eventos
                  </p>
                  <a
                    href="/festas"
                    className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Ver Eventos
                  </a>
                </div>
              ) : (
                <div className="space-y-6">
                  {profitData.map((event) => (
                    <div
                      key={event.eventId}
                      className="bg-dark-800 rounded-xl p-6 border border-dark-600"
                    >
                      {/* Event Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-display font-bold text-white mb-1">
                            {event.eventName}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {event.totalBoosts} boost(s) ativo(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400 mb-1">ROI do Evento</p>
                          <p className={`text-2xl font-bold ${
                            event.roi >= 0 ? 'text-neon-green' : 'text-red-400'
                          }`}>
                            {event.roi >= 0 ? '+' : ''}{event.roi.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Event Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Lucro Total</p>
                          <p className="text-xl font-bold text-neon-green">
                            {formatCurrency(event.totalProfit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Investido</p>
                          <p className="text-xl font-bold text-orange-400">
                            {formatCurrency(event.totalBoostCost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Vendas</p>
                          <p className="text-xl font-bold text-neon-pink">
                            {formatCurrency(event.totalTicketSales)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Ingressos</p>
                          <p className="text-xl font-bold text-white">
                            {event.totalTicketCount}
                          </p>
                        </div>
                      </div>

                      {/* Boosts List */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                          Boosts Individuais
                        </h4>
                        {event.boosts.map((boost) => (
                          <div
                            key={boost.boostId}
                            className="bg-dark-700 rounded-lg p-4 border border-dark-600"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                  <Zap size={20} className="text-orange-400" />
                                </div>
                                <div>
                                  <p className="font-semibold text-white">
                                    Boost {boost.boostType}
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    {formatDate(boost.startedAt)} - {getTimeRemaining(boost.expiresAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-sm text-gray-400">Lucro</p>
                                  <p className="text-lg font-bold text-neon-green">
                                    {formatCurrency(boost.profit)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {boost.ticketCount} ingresso(s)
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-400">Custo</p>
                                  <p className="text-lg font-bold text-orange-400">
                                    {formatCurrency(boost.price)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-400">ROI</p>
                                  <p className={`text-lg font-bold ${
                                    (boost.profit / boost.price) * 100 >= 0 
                                      ? 'text-neon-green' 
                                      : 'text-red-400'
                                  }`}>
                                    {((boost.profit / boost.price) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-dark-800 rounded-xl p-12 text-center border border-dark-600">
              <Zap size={64} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-bold text-white mb-2">
                Boosts Comprados
              </h3>
              <p className="text-gray-400">
                Em breve você poderá ver todos os boosts que comprou aqui
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}



