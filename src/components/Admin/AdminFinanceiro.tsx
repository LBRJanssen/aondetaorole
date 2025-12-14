'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { DollarSign, TrendingUp, ShoppingCart, Wallet, Search, User, Calendar, CheckCircle, XCircle, BarChart3, Shield, Clock, AlertTriangle, Menu, X, ChevronLeft, PieChart, Ticket, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis, CartesianGrid, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface DashboardData {
  totalBalance: number;
  totalDepositsThisMonth: number;
  totalPurchasesThisMonth: number;
  platformRevenue: number;
  operationalCosts: number;
  grossProfit: number;
  chargebackRate: number;
  averageTicket: number;
  ticketVariation: number;
  revenueVariation: number;
  balanceChartData: Array<{ date: string; balance: number }>;
  revenueChartData: Array<{ date: string; revenue: number }>;
}

interface CashflowData {
  month: number;
  year: number;
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

interface PendingWithdrawal {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  status: string;
}

interface UserTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  type: string;
  status: string;
}

interface AuditData {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  };
  lastLogin: string | null;
  recentActions: Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    status: string;
    timestamp: string;
  }>;
}

interface RevenueBreakdownData {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalRevenue: number;
    boostRevenue: number;
    premiumRevenue: number;
    ticketRevenue: number;
    totalDeposits: number;
    totalTicketSales: number;
    ticketCount: number;
    activeSubscriptions: number;
  };
  percentages: {
    boost: number;
    premium: number;
    tickets: number;
  };
  premiumByPlan: { [key: string]: number };
  monthlyTrend: Array<{
    month: number;
    year: number;
    label: string;
    boost: number;
    premium: number;
    tickets: number;
    total: number;
  }>;
}

type Tab = 'dashboard' | 'user-search' | 'withdrawals' | 'cashflow' | 'audit' | 'revenue-breakdown' | 'ticket-sales' | 'boost-report';

export default function AdminFinanceiro() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Dashboard
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Busca de usuário
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'id' | 'name'>('name');
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([]);
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [userDateRange, setUserDateRange] = useState({ start: '', end: '' });
  
  // Saques pendentes
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  
  // Fluxo de caixa
  const [cashflowData, setCashflowData] = useState<CashflowData[]>([]);
  const [isLoadingCashflow, setIsLoadingCashflow] = useState(false);
  const [cashflowDateRange, setCashflowDateRange] = useState({ start: '', end: '' });
  
  // Auditoria
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Receita por Fonte
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdownData | null>(null);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(false);
  const [revenueDateRange, setRevenueDateRange] = useState({ start: '', end: '' });

  // Vendas de Ingressos
  const [ticketSales, setTicketSales] = useState<any>(null);
  const [isLoadingTicketSales, setIsLoadingTicketSales] = useState(false);
  const [ticketSalesDateRange, setTicketSalesDateRange] = useState({ start: '', end: '' });

  // Relatório de Boosts
  const [boostReport, setBoostReport] = useState<any>(null);
  const [isLoadingBoostReport, setIsLoadingBoostReport] = useState(false);
  const [boostReportDateRange, setBoostReportDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    // Inicializar ranges de data com valores padrão
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setDateRange({
      start: firstDayOfMonth.toISOString().split('T')[0],
      end: lastDayOfMonth.toISOString().split('T')[0]
    });
    
    setUserDateRange({
      start: firstDayOfMonth.toISOString().split('T')[0],
      end: lastDayOfMonth.toISOString().split('T')[0]
    });
    
    setCashflowDateRange({
      start: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0],
      end: lastDayOfMonth.toISOString().split('T')[0]
    });

    setRevenueDateRange({
      start: firstDayOfMonth.toISOString().split('T')[0],
      end: lastDayOfMonth.toISOString().split('T')[0]
    });

    setTicketSalesDateRange({
      start: firstDayOfMonth.toISOString().split('T')[0],
      end: lastDayOfMonth.toISOString().split('T')[0]
    });

    setBoostReportDateRange({
      start: firstDayOfMonth.toISOString().split('T')[0],
      end: lastDayOfMonth.toISOString().split('T')[0]
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'withdrawals') {
      fetchPendingWithdrawals();
    } else if (activeTab === 'cashflow') {
      fetchCashflow();
    } else if (activeTab === 'audit') {
      fetchAudit();
    } else if (activeTab === 'revenue-breakdown') {
      fetchRevenueBreakdown();
    } else if (activeTab === 'ticket-sales') {
      fetchTicketSales();
    } else if (activeTab === 'boost-report') {
      fetchBoostReport();
    }
  }, [activeTab, dateRange, cashflowDateRange, revenueDateRange, ticketSalesDateRange, boostReportDateRange]);

  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      if (!token) {
        showToast('Você precisa estar logado', 'error');
        return;
      }

      const params = new URLSearchParams();
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);

      const response = await fetch(`/api/financial/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar dados do dashboard');
      }

      setDashboardData(data.data);
    } catch (error: any) {
      console.error('Erro ao buscar dashboard:', error);
      showToast(error.message || 'Erro ao buscar dados do dashboard', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingWithdrawals = async () => {
    try {
      setIsLoadingWithdrawals(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/financial/pending-withdrawals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar saques pendentes');
      }

      setPendingWithdrawals(data.data.withdrawals || []);
    } catch (error: any) {
      console.error('Erro ao buscar saques pendentes:', error);
      showToast(error.message || 'Erro ao buscar saques pendentes', 'error');
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };

  const fetchCashflow = async () => {
    try {
      setIsLoadingCashflow(true);
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (cashflowDateRange.start) params.append('start', cashflowDateRange.start);
      if (cashflowDateRange.end) params.append('end', cashflowDateRange.end);

      const response = await fetch(`/api/financial/cashflow?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar fluxo de caixa');
      }

      setCashflowData(data.data.cashflow || []);
    } catch (error: any) {
      console.error('Erro ao buscar fluxo de caixa:', error);
      showToast(error.message || 'Erro ao buscar fluxo de caixa', 'error');
    } finally {
      setIsLoadingCashflow(false);
    }
  };

  const fetchAudit = async () => {
    try {
      setIsLoadingAudit(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/financial/audit', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar informações de auditoria');
      }

      setAuditData(data.data);
    } catch (error: any) {
      console.error('Erro ao buscar auditoria:', error);
      showToast(error.message || 'Erro ao buscar informações de auditoria', 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const fetchRevenueBreakdown = async () => {
    try {
      setIsLoadingRevenue(true);
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (revenueDateRange.start) params.append('start', revenueDateRange.start);
      if (revenueDateRange.end) params.append('end', revenueDateRange.end);

      const response = await fetch(`/api/financial/revenue-breakdown?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar breakdown de receita');
      }

      setRevenueBreakdown(data.data);
    } catch (error: any) {
      console.error('Erro ao buscar breakdown de receita:', error);
      showToast(error.message || 'Erro ao buscar breakdown de receita', 'error');
    } finally {
      setIsLoadingRevenue(false);
    }
  };

  const fetchTicketSales = async () => {
    try {
      setIsLoadingTicketSales(true);
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (ticketSalesDateRange.start) params.append('start', ticketSalesDateRange.start);
      if (ticketSalesDateRange.end) params.append('end', ticketSalesDateRange.end);

      const response = await fetch(`/api/financial/ticket-sales?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar vendas de ingressos');
      }

      setTicketSales(data.data);
    } catch (error: any) {
      console.error('Erro ao buscar vendas de ingressos:', error);
      showToast(error.message || 'Erro ao buscar vendas de ingressos', 'error');
    } finally {
      setIsLoadingTicketSales(false);
    }
  };

  const fetchBoostReport = async () => {
    try {
      setIsLoadingBoostReport(true);
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (boostReportDateRange.start) params.append('start', boostReportDateRange.start);
      if (boostReportDateRange.end) params.append('end', boostReportDateRange.end);

      const response = await fetch(`/api/financial/boost-report?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar relatório de boosts');
      }

      setBoostReport(data.data);
    } catch (error: any) {
      console.error('Erro ao buscar relatório de boosts:', error);
      showToast(error.message || 'Erro ao buscar relatório de boosts', 'error');
    } finally {
      setIsLoadingBoostReport(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchQuery.trim()) {
      showToast('Digite um ID ou nome de usuário', 'error');
      return;
    }

    try {
      setIsSearching(true);
      const token = await getAuthToken();
      if (!token) return;

      const param = searchType === 'id' ? 'userId' : 'userName';
      const params = new URLSearchParams();
      params.append(param, searchQuery);
      if (userDateRange.start) params.append('start', userDateRange.start);
      if (userDateRange.end) params.append('end', userDateRange.end);

      const response = await fetch(`/api/financial/user-transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar transações');
      }

      setSearchedUser(data.data.user);
      setUserTransactions(data.data.transactions || []);
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      showToast(error.message || 'Erro ao buscar transações do usuário', 'error');
      setSearchedUser(null);
      setUserTransactions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleWithdrawalAction = async (transactionId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/financial/pending-withdrawals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionId,
          action,
          reason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar ação');
      }

      showToast(data.message || (action === 'approve' ? 'Saque aprovado com sucesso' : 'Saque recusado com sucesso'), 'success');
      fetchPendingWithdrawals();
    } catch (error: any) {
      console.error('Erro ao processar ação:', error);
      showToast(error.message || 'Erro ao processar ação', 'error');
    }
  };

  // Formatação monetária com fonte monospace
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

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: BarChart3 },
    { id: 'revenue-breakdown' as Tab, label: 'Receita por Fonte', icon: PieChart },
    { id: 'ticket-sales' as Tab, label: 'Vendas de Ingressos', icon: Ticket },
    { id: 'boost-report' as Tab, label: 'Relatório de Boosts', icon: Zap },
    { id: 'user-search' as Tab, label: 'Extrato por Usuário', icon: Search },
    { id: 'withdrawals' as Tab, label: 'Saques Pendentes', icon: Wallet },
    { id: 'cashflow' as Tab, label: 'Fluxo de Caixa', icon: TrendingUp },
    { id: 'audit' as Tab, label: 'Auditoria', icon: Shield },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-mono font-semibold">{formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full bg-dark-900 w-full m-0 p-0">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-dark-800 border-r border-dark-600 transition-all duration-300 flex flex-col h-full flex-shrink-0`}>
        <div className="p-4 border-b border-dark-600 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h2 className="font-display font-bold text-lg text-white">Painel Financeiro</h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <Menu size={20} className="text-gray-400" /> : <ChevronLeft size={20} className="text-gray-400" />}
          </button>
        </div>
        
        <nav className="flex-1 p-2 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/50'
                    : 'text-gray-400 hover:bg-dark-700 hover:text-white'
                }`}
                title={sidebarCollapsed ? tab.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">{tab.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 ml-0">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Header com Filtro de Data */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-2">Dashboard Financeiro</h1>
                <p className="text-gray-400 text-sm">Visão geral das operações financeiras</p>
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
                  onClick={fetchDashboard}
                  className="px-4 py-2 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg font-medium transition-colors"
                >
                  Filtrar
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <BarChart3 size={48} className="mx-auto text-gray-500 mb-4 animate-pulse" />
                  <p className="text-gray-400">Carregando dados do dashboard...</p>
                </div>
              </div>
            ) : dashboardData ? (
              <>
                {/* Cards de Resumo - Mantendo os 4 cards que o usuário gostou */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* SALDO DISPONÍVEL */}
                  <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border border-teal-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">SALDO DISPONÍVEL</h3>
                    <p className="text-3xl font-bold text-white mb-4 font-mono">{formatCurrency(dashboardData.totalBalance)}</p>
                    <div className="h-16 mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.balanceChartData}>
                          <Area 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="#14b8a6" 
                            fill="#14b8a6" 
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-teal-400">Estável últimos 7 dias</p>
                  </div>

                  {/* TAXA DE ESTORNO */}
                  <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">TAXA DE ESTORNO</h3>
                    <p className="text-3xl font-bold text-white mb-4 font-mono">{dashboardData.chargebackRate.toFixed(1)}%</p>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-yellow-400" />
                      <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            dashboardData.chargebackRate < 1 ? 'bg-green-500' :
                            dashboardData.chargebackRate < 3 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(dashboardData.chargebackRate * 10, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className={`text-xs ${
                      dashboardData.chargebackRate < 1 ? 'text-green-400' :
                      dashboardData.chargebackRate < 3 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {dashboardData.chargebackRate < 1 ? 'Baixo Risco' :
                       dashboardData.chargebackRate < 3 ? 'Risco Médio' : 'Alto Risco'}
                    </p>
                  </div>

                  {/* RECEITA BRUTA (30D) */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">RECEITA BRUTA (30D)</h3>
                    <p className="text-3xl font-bold text-white mb-4 font-mono">{formatCurrency(dashboardData.platformRevenue)}</p>
                    <div className="h-16 mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.revenueChartData}>
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#a855f7" 
                            fill="#a855f7" 
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className={`text-xs ${dashboardData.revenueVariation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {dashboardData.revenueVariation >= 0 ? '+' : ''}{dashboardData.revenueVariation.toFixed(1)}% vs Mês Anterior
                    </p>
                  </div>

                  {/* TICKET MÉDIO */}
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">TICKET MÉDIO</h3>
                    <p className="text-3xl font-bold text-white mb-4 font-mono">{formatCurrency(dashboardData.averageTicket)}</p>
                    <div className="flex items-center justify-center mb-2">
                      <DollarSign size={24} className="text-green-400" />
                    </div>
                    <p className={`text-xs ${dashboardData.ticketVariation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {dashboardData.ticketVariation >= 0 ? '+' : ''}{dashboardData.ticketVariation.toFixed(1)}% vs Mês Anterior
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Busca de Usuário Tab */}
        {activeTab === 'user-search' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-white mb-2">Extrato por Usuário</h1>
              <p className="text-gray-400 text-sm">Busque e visualize transações de usuários específicos</p>
            </div>

            {/* Busca */}
            <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Buscar por</label>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as 'id' | 'name')}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                  >
                    <option value="name">Nome</option>
                    <option value="id">ID do Usuário</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {searchType === 'id' ? 'ID do Usuário' : 'Nome do Usuário'}
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                    placeholder={searchType === 'id' ? 'Digite o UUID do usuário' : 'Digite o nome do usuário'}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Data Início</label>
                  <input
                    type="date"
                    value={userDateRange.start}
                    onChange={(e) => setUserDateRange({ ...userDateRange, start: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Data Fim</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={userDateRange.end}
                      onChange={(e) => setUserDateRange({ ...userDateRange, end: e.target.value })}
                      className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                    />
                    <button
                      onClick={handleSearchUser}
                      disabled={isSearching}
                      className="px-6 py-2 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSearching ? '...' : 'Buscar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado */}
            {searchedUser && (
              <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-2">Informações do Usuário</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Nome</p>
                      <p className="text-white font-medium">{searchedUser.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-white font-medium">{searchedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Saldo Atual</p>
                      <p className="text-white font-medium font-mono">{formatCurrency(searchedUser.currentBalance)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Extrato Financeiro</h3>
                  {userTransactions.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Nenhuma transação encontrada</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-dark-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Data e Hora</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Descrição</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Valor</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Saldo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-600">
                          {userTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-dark-700/50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-300">{formatDate(tx.date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-400">{tx.description}</td>
                              <td className={`px-4 py-3 text-sm font-medium text-right font-mono ${
                                tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {tx.type === 'deposit' ? '+' : '-'}
                                {formatCurrency(tx.amount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300 text-right font-mono">
                                Saldo: {formatCurrency(tx.balanceAfter)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saques Pendentes Tab */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-white mb-2">Saques Pendentes</h1>
              <p className="text-gray-400 text-sm">Gerencie solicitações de saque</p>
            </div>

            {isLoadingWithdrawals ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-gray-400">Carregando saques pendentes...</p>
              </div>
            ) : pendingWithdrawals.length === 0 ? (
              <div className="bg-dark-800 border border-dark-600 rounded-lg p-8 text-center shadow-lg">
                <Wallet size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">Nenhum saque pendente no momento</p>
              </div>
            ) : (
              <div className="bg-dark-800 border border-dark-600 rounded-lg overflow-hidden shadow-lg">
                <div className="p-4 border-b border-dark-600">
                  <h2 className="font-display font-bold text-lg text-white">
                    Saques Pendentes ({pendingWithdrawals.length})
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Total: <span className="font-mono font-semibold text-white">{formatCurrency(pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0))}</span>
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-dark-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Usuário</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Descrição</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Valor</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600">
                      {pendingWithdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-dark-700/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-300">{formatDate(withdrawal.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-white font-medium">{withdrawal.userName}</p>
                              <p className="text-xs text-gray-400">{withdrawal.userEmail}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">{withdrawal.description}</td>
                          <td className="px-4 py-3 text-sm font-medium text-red-400 text-right font-mono">
                            {formatCurrency(withdrawal.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleWithdrawalAction(withdrawal.id, 'approve')}
                                className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm font-medium transition-colors"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Motivo da recusa (opcional):');
                                  handleWithdrawalAction(withdrawal.id, 'reject', reason || undefined);
                                }}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm font-medium transition-colors"
                              >
                                Recusar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fluxo de Caixa Tab */}
        {activeTab === 'cashflow' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-2">Fluxo de Caixa</h1>
                <p className="text-gray-400 text-sm">Análise mensal de receitas e despesas</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={cashflowDateRange.start}
                  onChange={(e) => setCashflowDateRange({ ...cashflowDateRange, start: e.target.value })}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                />
                <input
                  type="date"
                  value={cashflowDateRange.end}
                  onChange={(e) => setCashflowDateRange({ ...cashflowDateRange, end: e.target.value })}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                />
                <button
                  onClick={fetchCashflow}
                  className="px-4 py-2 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg font-medium transition-colors"
                >
                  Filtrar
                </button>
              </div>
            </div>

            {isLoadingCashflow ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-gray-400">Carregando fluxo de caixa...</p>
              </div>
            ) : (
              <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                <h2 className="font-display font-bold text-lg text-white mb-6">Fluxo de Caixa Mensal</h2>
                
                {/* Gráfico Interativo com Tooltips */}
                <div className="mb-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashflowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="label" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#39FF14" name="Receita" />
                      <Bar dataKey="expenses" fill="#FF4444" name="Despesas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Lista Compacta */}
                <div className="space-y-2">
                  {cashflowData.map((month) => {
                    const maxValue = Math.max(...cashflowData.map(m => Math.max(m.revenue, m.expenses)));
                    const revenuePercent = maxValue > 0 ? (month.revenue / maxValue) * 100 : 0;
                    const expensesPercent = maxValue > 0 ? (month.expenses / maxValue) * 100 : 0;

                    return (
                      <div key={`${month.year}-${month.month}`} className="bg-dark-700 rounded-lg p-3 hover:bg-dark-600 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">{month.label}</span>
                          <div className="flex gap-4 text-xs">
                            <span className="text-green-400 font-mono">Receita: {formatCurrency(month.revenue)}</span>
                            <span className="text-red-400 font-mono">Despesas: {formatCurrency(month.expenses)}</span>
                            <span className={`font-mono ${month.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              Lucro: {formatCurrency(month.netProfit)}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-4 bg-dark-600 rounded overflow-hidden">
                          <div className="absolute inset-0 flex">
                            <div
                              className="bg-green-500/50 border-r border-green-500/70"
                              style={{ width: `${revenuePercent}%` }}
                              title={`Receita: ${formatCurrency(month.revenue)}`}
                            />
                            <div
                              className="bg-red-500/50"
                              style={{ width: `${expensesPercent}%` }}
                              title={`Despesas: ${formatCurrency(month.expenses)}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Resumo */}
                {cashflowData.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-dark-600 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-dark-700 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Total Receita</p>
                      <p className="text-xl font-bold text-green-400 font-mono">
                        {formatCurrency(cashflowData.reduce((sum, m) => sum + m.revenue, 0))}
                      </p>
                    </div>
                    <div className="bg-dark-700 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Total Despesas</p>
                      <p className="text-xl font-bold text-red-400 font-mono">
                        {formatCurrency(cashflowData.reduce((sum, m) => sum + m.expenses, 0))}
                      </p>
                    </div>
                    <div className="bg-dark-700 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Lucro Líquido Total</p>
                      <p className={`text-xl font-bold font-mono ${
                        cashflowData.reduce((sum, m) => sum + m.netProfit, 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(cashflowData.reduce((sum, m) => sum + m.netProfit, 0))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vendas de Ingressos Tab */}
        {activeTab === 'ticket-sales' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-2">Vendas de Ingressos</h1>
                <p className="text-gray-400 text-sm">Relatório detalhado de vendas de ingressos</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={ticketSalesDateRange.start}
                  onChange={(e) => setTicketSalesDateRange({ ...ticketSalesDateRange, start: e.target.value })}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                />
                <input
                  type="date"
                  value={ticketSalesDateRange.end}
                  onChange={(e) => setTicketSalesDateRange({ ...ticketSalesDateRange, end: e.target.value })}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                />
                <button
                  onClick={fetchTicketSales}
                  className="px-4 py-2 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg font-medium transition-colors"
                >
                  Filtrar
                </button>
              </div>
            </div>

            {isLoadingTicketSales ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Ticket size={48} className="mx-auto text-gray-500 mb-4 animate-pulse" />
                  <p className="text-gray-400">Carregando vendas de ingressos...</p>
                </div>
              </div>
            ) : ticketSales ? (
              <>
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">VENDAS TOTAIS</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(ticketSales.summary.totalSales)}</p>
                    <p className="text-xs text-green-400">{ticketSales.summary.totalTickets} ingressos vendidos</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">TICKET MÉDIO</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(ticketSales.summary.averageTicket)}</p>
                    <p className="text-xs text-blue-400">Por ingresso</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">COMISSÃO PLATAFORMA</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(ticketSales.summary.platformCommission)}</p>
                    <p className="text-xs text-purple-400">{ticketSales.summary.commissionPercent}% do total</p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">REPASSADO</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(ticketSales.summary.organizerAmount)}</p>
                    <p className="text-xs text-yellow-400">Para organizadores</p>
                  </div>
                </div>

                {/* Gráfico de Vendas Diárias */}
                {ticketSales.dailySales && ticketSales.dailySales.length > 0 && (
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Vendas por Dia</h2>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={ticketSales.dailySales}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#22c55e" 
                            fill="#22c55e" 
                            fillOpacity={0.2}
                            name="Vendas"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Comparação Boost vs Sem Boost */}
                {ticketSales.boostComparison && (
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Eventos com Boost vs Sem Boost</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-dark-700 rounded-lg p-4">
                        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                          <TrendingUp size={20} className="text-green-400" />
                          Com Boost
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Vendas</span>
                            <span className="text-white font-mono font-semibold">{formatCurrency(ticketSales.boostComparison.withBoost.sales)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ingressos</span>
                            <span className="text-white font-mono">{ticketSales.boostComparison.withBoost.tickets}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ticket Médio</span>
                            <span className="text-white font-mono">{formatCurrency(ticketSales.boostComparison.withBoost.averageTicket)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-dark-700 rounded-lg p-4">
                        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                          <BarChart3 size={20} className="text-yellow-400" />
                          Sem Boost
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Vendas</span>
                            <span className="text-white font-mono font-semibold">{formatCurrency(ticketSales.boostComparison.withoutBoost.sales)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ingressos</span>
                            <span className="text-white font-mono">{ticketSales.boostComparison.withoutBoost.tickets}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ticket Médio</span>
                            <span className="text-white font-mono">{formatCurrency(ticketSales.boostComparison.withoutBoost.averageTicket)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Eventos */}
                {ticketSales.topEvents && ticketSales.topEvents.length > 0 && (
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Top {ticketSales.topEvents.length} Eventos por Vendas</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-dark-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Evento</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Organizador</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Vendas</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Ingressos</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Ticket Médio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-600">
                          {ticketSales.topEvents.map((event: any, index: number) => (
                            <tr key={event.eventId} className="hover:bg-dark-700/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 text-sm">#{index + 1}</span>
                                  <span className="text-white font-medium">{event.eventName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-sm">{event.organizerName}</td>
                              <td className="px-4 py-3 text-green-400 font-mono text-right font-semibold">{formatCurrency(event.totalSales)}</td>
                              <td className="px-4 py-3 text-gray-300 text-right font-mono">{event.ticketCount}</td>
                              <td className="px-4 py-3 text-gray-300 text-right font-mono">{formatCurrency(event.averageTicket)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Resumo */}
                <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
                  <p className="text-sm text-gray-400">
                    Total de eventos com vendas: <span className="text-white font-semibold">{ticketSales.totalEvents}</span>
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Relatório de Boosts Tab */}
        {activeTab === 'boost-report' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-2">Relatório de Boosts</h1>
                <p className="text-gray-400 text-sm">Análise de vendas e performance de boosts</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={boostReportDateRange.start}
                  onChange={(e) => setBoostReportDateRange({ ...boostReportDateRange, start: e.target.value })}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                />
                <input
                  type="date"
                  value={boostReportDateRange.end}
                  onChange={(e) => setBoostReportDateRange({ ...boostReportDateRange, end: e.target.value })}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                />
                <button
                  onClick={fetchBoostReport}
                  className="px-4 py-2 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg font-medium transition-colors"
                >
                  Filtrar
                </button>
              </div>
            </div>

            {isLoadingBoostReport ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Zap size={48} className="mx-auto text-gray-500 mb-4 animate-pulse" />
                  <p className="text-gray-400">Carregando relatório de boosts...</p>
                </div>
              </div>
            ) : boostReport ? (
              <>
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">RECEITA TOTAL</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(boostReport.summary.totalBoostRevenue)}</p>
                    <p className="text-xs text-yellow-400">{boostReport.summary.totalBoosts} boosts vendidos</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">PREÇO MÉDIO</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(boostReport.summary.averageBoostPrice)}</p>
                    <p className="text-xs text-blue-400">Por boost</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">BOOSTS ATIVOS</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{boostReport.summary.activeBoostsCount}</p>
                    <p className="text-xs text-green-400">No momento</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">EVENTOS</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{boostReport.totalEvents}</p>
                    <p className="text-xs text-purple-400">Com boosts no período</p>
                  </div>
                </div>

                {/* Distribuição por Tipo */}
                {boostReport.byType && (
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Distribuição por Tipo</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-dark-700 rounded-lg p-4">
                        <h3 className="text-white font-medium mb-3">Boost 12h</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Quantidade</span>
                            <span className="text-white font-mono font-semibold">{boostReport.byType['12h'].count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Receita</span>
                            <span className="text-yellow-400 font-mono font-semibold">{formatCurrency(boostReport.byType['12h'].revenue)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-dark-700 rounded-lg p-4">
                        <h3 className="text-white font-medium mb-3">Boost 24h</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Quantidade</span>
                            <span className="text-white font-mono font-semibold">{boostReport.byType['24h'].count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Receita</span>
                            <span className="text-yellow-400 font-mono font-semibold">{formatCurrency(boostReport.byType['24h'].revenue)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gráfico de Vendas Diárias */}
                {boostReport.dailySales && boostReport.dailySales.length > 0 && (
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Vendas por Dia</h2>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={boostReport.dailySales}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#eab308" 
                            fill="#eab308" 
                            fillOpacity={0.2}
                            name="Receita"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Top Eventos */}
                {boostReport.topEvents && boostReport.topEvents.length > 0 && (
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Top {boostReport.topEvents.length} Eventos por Boosts</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-dark-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Evento</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Organizador</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Boosts</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Receita</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-600">
                          {boostReport.topEvents.map((event: any, index: number) => (
                            <tr key={event.eventId} className="hover:bg-dark-700/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 text-sm">#{index + 1}</span>
                                  <span className="text-white font-medium">{event.eventName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-sm">{event.organizerName}</td>
                              <td className="px-4 py-3 text-blue-400 font-mono text-right font-semibold">{event.boostCount}</td>
                              <td className="px-4 py-3 text-yellow-400 font-mono text-right font-semibold">{formatCurrency(event.totalRevenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top Compradores */}
                {boostReport.topBuyers && boostReport.topBuyers.length > 0 && (
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Top 10 Compradores de Boosts</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-dark-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Usuário</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Boosts</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Total Gasto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-600">
                          {boostReport.topBuyers.map((buyer: any, index: number) => (
                            <tr key={buyer.userId} className="hover:bg-dark-700/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 text-sm">#{index + 1}</span>
                                  <div>
                                    <p className="text-white font-medium">{buyer.name}</p>
                                    <p className="text-xs text-gray-400">{buyer.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-blue-400 font-mono text-right font-semibold">{buyer.count}</td>
                              <td className="px-4 py-3 text-yellow-400 font-mono text-right font-semibold">{formatCurrency(buyer.totalSpent)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Receita por Fonte Tab */}
        {activeTab === 'revenue-breakdown' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-white mb-2">Receita por Fonte</h1>
                <p className="text-gray-400 text-sm">Análise detalhada de onde vem a receita</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={revenueDateRange.start}
                  onChange={(e) => setRevenueDateRange({ ...revenueDateRange, start: e.target.value })}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                />
                <input
                  type="date"
                  value={revenueDateRange.end}
                  onChange={(e) => setRevenueDateRange({ ...revenueDateRange, end: e.target.value })}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-pink/50"
                />
                <button
                  onClick={fetchRevenueBreakdown}
                  className="px-4 py-2 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg font-medium transition-colors"
                >
                  Filtrar
                </button>
              </div>
            </div>

            {isLoadingRevenue ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <PieChart size={48} className="mx-auto text-gray-500 mb-4 animate-pulse" />
                  <p className="text-gray-400">Carregando breakdown de receita...</p>
                </div>
              </div>
            ) : revenueBreakdown ? (
              <>
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">RECEITA TOTAL</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(revenueBreakdown.summary.totalRevenue)}</p>
                    <p className="text-xs text-purple-400">Período selecionado</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">BOOSTS</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(revenueBreakdown.summary.boostRevenue)}</p>
                    <p className="text-xs text-blue-400">{revenueBreakdown.percentages.boost.toFixed(1)}% do total</p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">PREMIUM</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(revenueBreakdown.summary.premiumRevenue)}</p>
                    <p className="text-xs text-yellow-400">{revenueBreakdown.percentages.premium.toFixed(1)}% do total • {revenueBreakdown.summary.activeSubscriptions} ativas</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-6 shadow-lg">
                    <h3 className="text-gray-300 text-sm font-medium mb-2">INGRESSOS</h3>
                    <p className="text-3xl font-bold text-white mb-2 font-mono">{formatCurrency(revenueBreakdown.summary.ticketRevenue)}</p>
                    <p className="text-xs text-green-400">{revenueBreakdown.percentages.tickets.toFixed(1)}% do total • {revenueBreakdown.summary.ticketCount} vendidos</p>
                  </div>
                </div>

                {/* Gráfico de Pizza e Tendencias */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Pizza */}
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Distribuição de Receita</h2>
                    {revenueBreakdown.summary.totalRevenue > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
                                      <p className="text-white font-medium">{payload[0].name}</p>
                                      <p className="text-sm font-mono text-neon-pink">
                                        {formatCurrency(payload[0].value as number)}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {((payload[0].value as number / revenueBreakdown.summary.totalRevenue) * 100).toFixed(1)}%
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend />
                            <Pie 
                              data={[
                                { name: 'Boosts', value: revenueBreakdown.summary.boostRevenue, color: '#3b82f6' },
                                { name: 'Premium', value: revenueBreakdown.summary.premiumRevenue, color: '#eab308' },
                                { name: 'Ingressos', value: revenueBreakdown.summary.ticketRevenue, color: '#22c55e' },
                              ]}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {[
                                { name: 'Boosts', value: revenueBreakdown.summary.boostRevenue, color: '#3b82f6' },
                                { name: 'Premium', value: revenueBreakdown.summary.premiumRevenue, color: '#eab308' },
                                { name: 'Ingressos', value: revenueBreakdown.summary.ticketRevenue, color: '#22c55e' },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-gray-400">Nenhuma receita no período</p>
                      </div>
                    )}
                  </div>

                  {/* Premium por Plano */}
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Premium por Plano</h2>
                    {Object.keys(revenueBreakdown.premiumByPlan).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(revenueBreakdown.premiumByPlan).map(([plan, amount]) => (
                          <div key={plan} className="bg-dark-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium capitalize">{plan}</span>
                              <span className="text-yellow-400 font-mono font-semibold">{formatCurrency(amount)}</span>
                            </div>
                            <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-500"
                                style={{ width: `${(amount / revenueBreakdown.summary.premiumRevenue) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <p className="text-gray-400">Nenhuma assinatura premium no período</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gráfico de Tendências Mensais */}
                {revenueBreakdown.monthlyTrend && revenueBreakdown.monthlyTrend.length > 0 && (
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                    <h2 className="font-display font-bold text-lg text-white mb-4">Tendência Mensal (Últimos 6 Meses)</h2>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueBreakdown.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="label" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="boost" fill="#3b82f6" name="Boosts" stackId="revenue" />
                          <Bar dataKey="premium" fill="#eab308" name="Premium" stackId="revenue" />
                          <Bar dataKey="tickets" fill="#22c55e" name="Ingressos" stackId="revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Informações Adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Total de Depósitos</p>
                    <p className="text-xl font-bold text-white font-mono">{formatCurrency(revenueBreakdown.summary.totalDeposits)}</p>
                    <p className="text-xs text-gray-500 mt-1">Valor total depositado pelos usuários</p>
                  </div>
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Vendas de Ingressos</p>
                    <p className="text-xl font-bold text-white font-mono">{formatCurrency(revenueBreakdown.summary.totalTicketSales)}</p>
                    <p className="text-xs text-gray-500 mt-1">Total bruto (antes da comissão)</p>
                  </div>
                  <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Assinaturas Ativas</p>
                    <p className="text-xl font-bold text-white font-mono">{revenueBreakdown.summary.activeSubscriptions}</p>
                    <p className="text-xs text-gray-500 mt-1">Premium subscriptions ativas</p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Auditoria Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-white mb-2">Auditoria</h1>
              <p className="text-gray-400 text-sm">Informações de segurança e ações recentes</p>
            </div>

            {isLoadingAudit ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-gray-400">Carregando informações de auditoria...</p>
              </div>
            ) : auditData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações do Usuário */}
                <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                  <h3 className="font-display font-bold text-lg text-white mb-4">Informações do Usuário</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Nome</p>
                      <p className="text-white font-medium">{auditData.user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-white font-medium">{auditData.user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Cargo</p>
                      <p className="text-white font-medium capitalize">{auditData.user.role}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Último Login</p>
                      <p className="text-white font-medium">
                        {auditData.lastLogin ? formatDate(auditData.lastLogin) : 'Nunca'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Conta Criada</p>
                      <p className="text-white font-medium">{formatDate(auditData.user.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Ações Recentes */}
                <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 shadow-lg">
                  <h3 className="font-display font-bold text-lg text-white mb-4">Ações Recentes</h3>
                  {auditData.recentActions.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Nenhuma ação recente</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {auditData.recentActions.map((action) => (
                        <div key={action.id} className="bg-dark-700 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-white font-medium">{action.description}</p>
                              <p className="text-xs text-gray-400 mt-1">{formatDate(action.timestamp)}</p>
                            </div>
                            <div className="ml-4 text-right">
                              <p className={`text-sm font-medium font-mono ${
                                action.type === 'deposit' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {action.type === 'deposit' ? '+' : '-'}
                                {formatCurrency(action.amount)}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                action.status === 'completed' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : action.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {action.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
