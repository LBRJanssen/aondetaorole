'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { TrendingUp, Calendar, DollarSign, Users, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface DetailedAnalytics {
  userGrowth: Array<{ date?: string; month?: string; count: number; cumulative: number }>;
  eventsByMonth: Array<{ date?: string; month?: string; count: number }>;
  transactionAnalysis: Array<{
    date?: string;
    month?: string;
    deposits: number;
    withdrawals: number;
    purchases: number;
    boosts: number;
    total: number;
  }>;
  engagementMetrics: {
    totalViews: number;
    totalInterested: number;
    totalGoing: number;
    avgViewsPerEvent: number;
    engagementRate: number;
    byMonth: Array<{ date?: string; month?: string; views: number; interested: number; going: number }>;
  };
  period?: {
    groupBy: string;
  };
}

export default function AdminDetailedAnalytics() {
  const { showToast } = useToast();
  const [detailedAnalytics, setDetailedAnalytics] = useState<DetailedAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day'); // Padrão: por dia
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set([
    'userGrowth',
    'eventsByMonth',
    'transactionAnalysis',
    'engagementMetrics',
    'engagementChart'
  ]));

  useEffect(() => {
    fetchDetailedAnalytics();
  }, [groupBy]);

  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const fetchDetailedAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      const months = groupBy === 'day' ? '3' : '12';
      const response = await fetch(`/api/admin/statistics/detailed?months=${months}&groupBy=${groupBy}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar análises detalhadas');
      }

      console.log('📊 [AdminDetailedAnalytics] Dados recebidos:', {
        userGrowth: result.data?.userGrowth?.length || 0,
        eventsByMonth: result.data?.eventsByMonth?.length || 0,
        transactionAnalysis: result.data?.transactionAnalysis?.length || 0,
        engagementByMonth: result.data?.engagementMetrics?.byMonth?.length || 0,
        engagementMetrics: result.data?.engagementMetrics ? 'existe' : 'não existe'
      });

      setDetailedAnalytics(result.data);
    } catch (error) {
      console.error('Erro ao buscar análises detalhadas:', error);
      showToast('Erro ao carregar análises detalhadas.', 'error');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const formatDate = (dateOrMonth: string, isDay: boolean) => {
    if (isDay) {
      const [year, month, day] = dateOrMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } else {
      const [year, monthNum] = dateOrMonth.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    }
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const toggleChart = (chartId: string) => {
    const newExpanded = new Set(expandedCharts);
    if (newExpanded.has(chartId)) {
      newExpanded.delete(chartId);
    } else {
      newExpanded.add(chartId);
    }
    setExpandedCharts(newExpanded);
  };

  if (isLoadingAnalytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!detailedAnalytics) {
    return (
      <div className="card">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            Erro ao carregar análises detalhadas. Tente novamente mais tarde.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
                Análises Detalhadas
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm">
                Gráficos e métricas detalhadas da plataforma
              </p>
            </div>
          </div>
          {/* Toggle Global de Visualização */}
          <div className="flex items-center gap-3 bg-dark-700 rounded-lg p-1">
            <button
              onClick={() => setGroupBy('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                groupBy === 'day'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Por Dia
            </button>
            <button
              onClick={() => setGroupBy('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                groupBy === 'month'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Por Mês
            </button>
          </div>
        </div>
      </div>

      {/* Gráfico de Crescimento de Usuários */}
      <div className="card">
        <button
          onClick={() => toggleChart('userGrowth')}
          className="w-full font-display font-bold text-lg text-white mb-4 flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-400" size={20} />
            Gráfico de Crescimento de Usuários
          </div>
          {expandedCharts.has('userGrowth') ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </button>
        {expandedCharts.has('userGrowth') && (
          <>
            {detailedAnalytics.userGrowth && detailedAnalytics.userGrowth.length > 0 ? (() => {
              const cumulativeValues = detailedAnalytics.userGrowth.map(d => d.cumulative);
              const countValues = detailedAnalytics.userGrowth.map(d => d.count);
              const maxCumulative = cumulativeValues.length > 0 ? Math.max(...cumulativeValues) : 0;
              const maxCount = countValues.length > 0 ? Math.max(...countValues) : 0;
              const maxValue = Math.max(maxCumulative, maxCount, 1);
              const yAxisDomain = [0, maxValue * 1.25]; // Adiciona 25% de espaço acima
              
              return (
                <div style={{ width: '100%', height: '450px', minHeight: '450px' }}>
                  <ResponsiveContainer width="100%" height={450} minHeight={450}>
                    <LineChart data={detailedAnalytics.userGrowth} width={800} height={450}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey={groupBy === 'day' ? 'date' : 'month'} 
                        stroke="#9CA3AF"
                        tickFormatter={(value) => formatDate(value as string, groupBy === 'day')}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        domain={yAxisDomain}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(value) => formatDate(value as string, groupBy === 'day')}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Total de Usuários"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Novos Usuários"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })() : (
              <div className="text-center py-12 text-gray-400">
                <TrendingUp className="mx-auto mb-2 text-gray-500" size={32} />
                <p className="text-sm">Nenhum dado disponível</p>
                <p className="text-xs text-gray-500 mt-1">
                  {detailedAnalytics.userGrowth ? `(${detailedAnalytics.userGrowth.length} meses sem usuários)` : '(sem usuários no período)'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Gráfico de Eventos por Mês */}
      <div className="card">
        <button
          onClick={() => toggleChart('eventsByMonth')}
          className="w-full font-display font-bold text-lg text-white mb-4 flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Calendar className="text-purple-400" size={20} />
            Gráfico de Eventos por Mês
          </div>
          {expandedCharts.has('eventsByMonth') ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </button>
        {expandedCharts.has('eventsByMonth') && (
          <>
            {detailedAnalytics.eventsByMonth && detailedAnalytics.eventsByMonth.length > 0 ? (() => {
              const countValues = detailedAnalytics.eventsByMonth.map(d => d.count);
              const maxValue = countValues.length > 0 ? Math.max(...countValues) : 1;
              const yAxisDomain = [0, maxValue * 1.25]; // Adiciona 25% de espaço acima
              
              return (
                <div style={{ width: '100%', height: '450px', minHeight: '450px' }}>
                  <ResponsiveContainer width="100%" height={450} minHeight={450}>
                    <LineChart data={detailedAnalytics.eventsByMonth} width={800} height={450}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey={groupBy === 'day' ? 'date' : 'month'} 
                        stroke="#9CA3AF"
                        tickFormatter={(value) => formatDate(value as string, groupBy === 'day')}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        domain={yAxisDomain}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(value) => formatDate(value as string, groupBy === 'day')}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#a855f7" 
                        strokeWidth={3}
                        dot={{ fill: '#a855f7', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Eventos Criados"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })() : (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="mx-auto mb-2 text-gray-500" size={32} />
                <p className="text-sm">Nenhum dado disponível</p>
                <p className="text-xs text-gray-500 mt-1">
                  {detailedAnalytics.eventsByMonth ? `(${detailedAnalytics.eventsByMonth.length} meses sem eventos)` : '(sem eventos no período)'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Análise de Transações */}
      <div className="card">
        <button
          onClick={() => toggleChart('transactionAnalysis')}
          className="w-full font-display font-bold text-lg text-white mb-4 flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="text-green-400" size={20} />
            Análise de Transações
          </div>
          {expandedCharts.has('transactionAnalysis') ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </button>
        {expandedCharts.has('transactionAnalysis') && (
          <>
            {detailedAnalytics.transactionAnalysis && detailedAnalytics.transactionAnalysis.length > 0 ? (() => {
              const depositsValues = detailedAnalytics.transactionAnalysis.map(d => d.deposits);
              const purchasesValues = detailedAnalytics.transactionAnalysis.map(d => d.purchases);
              const boostsValues = detailedAnalytics.transactionAnalysis.map(d => d.boosts);
              const withdrawalsValues = detailedAnalytics.transactionAnalysis.map(d => d.withdrawals);
              const totalValues = detailedAnalytics.transactionAnalysis.map(d => d.deposits + d.purchases + d.boosts + d.withdrawals);
              const maxDeposits = depositsValues.length > 0 ? Math.max(...depositsValues) : 0;
              const maxPurchases = purchasesValues.length > 0 ? Math.max(...purchasesValues) : 0;
              const maxBoosts = boostsValues.length > 0 ? Math.max(...boostsValues) : 0;
              const maxWithdrawals = withdrawalsValues.length > 0 ? Math.max(...withdrawalsValues) : 0;
              const maxTotal = totalValues.length > 0 ? Math.max(...totalValues) : 0;
              const maxValue = Math.max(maxDeposits, maxPurchases, maxBoosts, maxWithdrawals, maxTotal, 1);
              const yAxisDomain = [0, maxValue * 1.25]; // Adiciona 25% de espaço acima
              
              return (
                <div style={{ width: '100%', height: '450px', minHeight: '450px' }}>
                  <ResponsiveContainer width="100%" height={450} minHeight={450}>
                    <LineChart data={detailedAnalytics.transactionAnalysis} width={800} height={450}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey={groupBy === 'day' ? 'date' : 'month'} 
                        stroke="#9CA3AF"
                        tickFormatter={(value) => formatDate(value as string, groupBy === 'day')}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        domain={yAxisDomain}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(value) => formatDate(value as string, groupBy === 'day')}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="deposits" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Depósitos"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="purchases" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Compras"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="boosts" 
                        stroke="#a855f7" 
                        strokeWidth={3}
                        dot={{ fill: '#a855f7', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Boosts"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="withdrawals" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        dot={{ fill: '#ef4444', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Saques"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })() : (
              <div className="text-center py-12 text-gray-400">
                <DollarSign className="mx-auto mb-2 text-gray-500" size={32} />
                <p className="text-sm">Nenhum dado disponível</p>
                <p className="text-xs text-gray-500 mt-1">
                  {detailedAnalytics.transactionAnalysis ? `(${detailedAnalytics.transactionAnalysis.length} meses sem transações)` : '(sem transações no período)'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Métricas de Engajamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cards de Métricas */}
        <div className="card">
          <button
            onClick={() => toggleChart('engagementMetrics')}
            className="w-full font-display font-bold text-lg text-white mb-4 flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <Users className="text-yellow-400" size={20} />
              Métricas de Engajamento
            </div>
            {expandedCharts.has('engagementMetrics') ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </button>
          {expandedCharts.has('engagementMetrics') && (
            <>
              {detailedAnalytics.engagementMetrics ? (
                <div className="space-y-4">
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Total de Visualizações</p>
                    <p className="text-2xl font-bold text-white">{detailedAnalytics.engagementMetrics.totalViews.toLocaleString()}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Interessados</p>
                    <p className="text-2xl font-bold text-white">{detailedAnalytics.engagementMetrics.totalInterested.toLocaleString()}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Confirmados</p>
                    <p className="text-2xl font-bold text-white">{detailedAnalytics.engagementMetrics.totalGoing.toLocaleString()}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Média de Visualizações por Evento</p>
                    <p className="text-2xl font-bold text-white">{detailedAnalytics.engagementMetrics.avgViewsPerEvent.toLocaleString()}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Taxa de Engajamento</p>
                    <p className="text-2xl font-bold text-green-400">{detailedAnalytics.engagementMetrics.engagementRate.toFixed(2)}%</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Dados não disponíveis
                </div>
              )}
            </>
          )}
        </div>

        {/* Gráfico de Engajamento por Mês */}
        <div className="card">
          <button
            onClick={() => toggleChart('engagementChart')}
            className="w-full font-display font-bold text-lg text-white mb-4 flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="text-pink-400" size={20} />
              Engajamento por Mês
            </div>
            {expandedCharts.has('engagementChart') ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </button>
          {expandedCharts.has('engagementChart') && (
            <>
              {detailedAnalytics.engagementMetrics?.byMonth && detailedAnalytics.engagementMetrics.byMonth.length > 0 ? (() => {
                const viewsValues = detailedAnalytics.engagementMetrics.byMonth.map(d => d.views);
                const interestedValues = detailedAnalytics.engagementMetrics.byMonth.map(d => d.interested);
                const goingValues = detailedAnalytics.engagementMetrics.byMonth.map(d => d.going);
                const maxViews = viewsValues.length > 0 ? Math.max(...viewsValues) : 0;
                const maxInterested = interestedValues.length > 0 ? Math.max(...interestedValues) : 0;
                const maxGoing = goingValues.length > 0 ? Math.max(...goingValues) : 0;
                const maxValue = Math.max(maxViews, maxInterested, maxGoing, 1);
                const yAxisDomain = [0, maxValue * 1.25]; // Adiciona 25% de espaço acima
                
                return (
                  <div style={{ width: '100%', height: '450px', minHeight: '450px' }}>
                    <ResponsiveContainer width="100%" height={450} minHeight={450}>
                      <LineChart data={detailedAnalytics.engagementMetrics.byMonth} width={800} height={450}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey={groupBy === 'day' ? 'date' : 'month'} 
                          stroke="#9CA3AF"
                          tickFormatter={(value) => formatDate(value as string, groupBy === 'day')}
                        />
                        <YAxis 
                          stroke="#9CA3AF"
                          domain={yAxisDomain}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                          labelFormatter={(value) => formatDate(value as string, groupBy === 'day')}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="views" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', r: 5 }}
                          activeDot={{ r: 7 }}
                          name="Visualizações"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="interested" 
                          stroke="#eab308" 
                          strokeWidth={3}
                          dot={{ fill: '#eab308', r: 5 }}
                          activeDot={{ r: 7 }}
                          name="Interessados"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="going" 
                          stroke="#22c55e" 
                          strokeWidth={3}
                          dot={{ fill: '#22c55e', r: 5 }}
                          activeDot={{ r: 7 }}
                          name="Confirmados"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })() : (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="mx-auto mb-2 text-gray-500" size={32} />
                  <p className="text-sm">Nenhum dado disponível</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {detailedAnalytics.engagementMetrics?.byMonth ? `(${detailedAnalytics.engagementMetrics.byMonth.length} meses sem dados)` : '(sem dados de engajamento no período)'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

