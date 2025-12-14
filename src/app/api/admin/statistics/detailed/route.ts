import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper para verificar se usuário tem acesso admin
async function hasAdminAccess(userId: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_type')
    .eq('id', userId)
    .single();

  if (!profile) return false;
  return ['owner', 'admin', 'financeiro'].includes(profile.user_type);
}

// GET /api/admin/statistics/detailed - Obter análises detalhadas
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Admin] GET /statistics/detailed - Iniciando...');

    // 1. Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // 2. Verificar permissão admin
    const hasAccess = await hasAdminAccess(user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado. Apenas Owner, Admin e Financeiro podem acessar.' }, { status: 403 });
    }

    // 3. Pegar parâmetros de período e agrupamento
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'day'; // Padrão: por dia
    const months = parseInt(searchParams.get('months') || (groupBy === 'day' ? '3' : '12')); // 3 meses para dias, 12 para meses

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
    startDate.setHours(0, 0, 0, 0);

    // 4. Gráfico de crescimento de usuários (por mês)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (usersError) {
      console.error('❌ [API Admin] Erro ao buscar usuários:', usersError);
    }

    // Agrupar usuários por dia ou mês
    const userGrowthData: Array<{ date?: string; month?: string; count: number; cumulative: number }> = [];
    const userGrowthMap = new Map<string, number>();
    let cumulativeUsers = 0;

    users?.forEach(user => {
      const date = new Date(user.created_at);
      let key: string;
      if (groupBy === 'day') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      userGrowthMap.set(key, (userGrowthMap.get(key) || 0) + 1);
    });

    // Criar array ordenado
    const sortedKeys = Array.from(userGrowthMap.keys()).sort();
    sortedKeys.forEach(key => {
      const count = userGrowthMap.get(key) || 0;
      cumulativeUsers += count;
      if (groupBy === 'day') {
        userGrowthData.push({
          date: key,
          count: count,
          cumulative: cumulativeUsers
        });
      } else {
        userGrowthData.push({
          month: key,
          count: count,
          cumulative: cumulativeUsers
        });
      }
    });

    // 5. Gráfico de eventos por mês
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, created_at, views, interested_count, going_count')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (eventsError) {
      console.error('❌ [API Admin] Erro ao buscar eventos:', eventsError);
    }

    // Agrupar eventos por dia ou mês
    const eventsByMonthData: Array<{ date?: string; month?: string; count: number }> = [];
    const eventsMap = new Map<string, number>();

    events?.forEach(event => {
      const date = new Date(event.created_at);
      let key: string;
      if (groupBy === 'day') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      eventsMap.set(key, (eventsMap.get(key) || 0) + 1);
    });

    // Criar array ordenado
    const sortedEventKeys = Array.from(eventsMap.keys()).sort();
    sortedEventKeys.forEach(key => {
      if (groupBy === 'day') {
        eventsByMonthData.push({
          date: key,
          count: eventsMap.get(key) || 0
        });
      } else {
        eventsByMonthData.push({
          month: key,
          count: eventsMap.get(key) || 0
        });
      }
    });

    // 6. Análise de transações (por tipo e mês)
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('type, amount, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (transactionsError) {
      console.error('❌ [API Admin] Erro ao buscar transações:', transactionsError);
    }

    // Agrupar transações por tipo e dia/mês
    const transactionAnalysisData: Array<{
      date?: string;
      month?: string;
      deposits: number;
      withdrawals: number;
      purchases: number;
      boosts: number;
      total: number;
    }> = [];

    const transactionMap = new Map<string, {
      deposits: number;
      withdrawals: number;
      purchases: number;
      boosts: number;
    }>();

    transactions?.forEach(tx => {
      const date = new Date(tx.created_at);
      let key: string;
      if (groupBy === 'day') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      const amount = Math.abs(parseFloat(tx.amount) || 0);

      if (!transactionMap.has(key)) {
        transactionMap.set(key, {
          deposits: 0,
          withdrawals: 0,
          purchases: 0,
          boosts: 0
        });
      }

      const keyData = transactionMap.get(key)!;

      switch (tx.type) {
        case 'deposit':
          keyData.deposits += amount;
          break;
        case 'withdraw':
          keyData.withdrawals += amount;
          break;
        case 'purchase':
          keyData.purchases += amount;
          break;
        case 'boost':
          keyData.boosts += amount;
          break;
      }
    });

    // Criar array ordenado
    const sortedTransactionKeys = Array.from(transactionMap.keys()).sort();
    sortedTransactionKeys.forEach(key => {
      const data = transactionMap.get(key)!;
      if (groupBy === 'day') {
        transactionAnalysisData.push({
          date: key,
          ...data,
          total: data.deposits + data.withdrawals + data.purchases + data.boosts
        });
      } else {
        transactionAnalysisData.push({
          month: key,
          ...data,
          total: data.deposits + data.withdrawals + data.purchases + data.boosts
        });
      }
    });

    // 7. Métricas de engajamento
    const totalViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
    const totalInterested = events?.reduce((sum, e) => sum + (e.interested_count || 0), 0) || 0;
    const totalGoing = events?.reduce((sum, e) => sum + (e.going_count || 0), 0) || 0;
    const avgViewsPerEvent = events && events.length > 0 ? totalViews / events.length : 0;
    const engagementRate = totalViews > 0 ? ((totalInterested + totalGoing) / totalViews) * 100 : 0;

    // Engajamento por dia ou mês
    const engagementData: Array<{
      date?: string;
      month?: string;
      views: number;
      interested: number;
      going: number;
    }> = [];

    if (events) {
      const engagementMap = new Map<string, { views: number; interested: number; going: number }>();
      
      events.forEach((event) => {
        const date = new Date(event.created_at);
        let key: string;
        if (groupBy === 'day') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (!engagementMap.has(key)) {
          engagementMap.set(key, { views: 0, interested: 0, going: 0 });
        }

        const keyData = engagementMap.get(key)!;
        keyData.views += event.views || 0;
        keyData.interested += event.interested_count || 0;
        keyData.going += event.going_count || 0;
      });

      const sortedEngagementKeys = Array.from(engagementMap.keys()).sort();
      sortedEngagementKeys.forEach(key => {
        if (groupBy === 'day') {
          engagementData.push({
            date: key,
            ...engagementMap.get(key)!
          });
        } else {
          engagementData.push({
            month: key,
            ...engagementMap.get(key)!
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userGrowth: userGrowthData,
        eventsByMonth: eventsByMonthData,
        transactionAnalysis: transactionAnalysisData,
        engagementMetrics: {
          totalViews,
          totalInterested,
          totalGoing,
          avgViewsPerEvent: Math.round(avgViewsPerEvent * 100) / 100,
          engagementRate: Math.round(engagementRate * 100) / 100,
          byMonth: engagementData
        },
        period: {
          start: startDate.toISOString(),
          end: now.toISOString(),
          months: months,
          groupBy: groupBy
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Admin] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar análises detalhadas',
      details: error.message 
    }, { status: 500 });
  }
}

