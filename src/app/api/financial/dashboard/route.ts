import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper para verificar se usuário tem acesso financeiro
async function hasFinancialAccess(userId: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_type')
    .eq('id', userId)
    .single();

  if (!profile) return false;
  return profile.user_type === 'owner' || profile.user_type === 'financeiro';
}

// GET /api/financial/dashboard - Dashboard financeiro geral
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] GET /dashboard - Iniciando...');

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

    // 2. Verificar permissão financeira
    const hasAccess = await hasFinancialAccess(user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado. Apenas Owner e Financeiro podem acessar.' }, { status: 403 });
    }

    // 3. Calcular período (usar filtros de data se fornecidos, senão usar mês atual)
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    const now = new Date();
    let firstDayOfMonth: Date;
    let lastDayOfMonth: Date;
    
    if (startParam && endParam) {
      firstDayOfMonth = new Date(startParam);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      lastDayOfMonth = new Date(endParam);
      lastDayOfMonth.setHours(23, 59, 59, 999);
    } else {
      firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // 4. Buscar saldo total de todas as carteiras
    const { data: allWallets, error: walletsError } = await supabaseAdmin
      .from('wallets')
      .select('balance, total_deposited, total_withdrawn');

    if (walletsError) {
      console.error('❌ [API Financial] Erro ao buscar carteiras:', walletsError);
      return NextResponse.json({ error: 'Erro ao buscar dados financeiros' }, { status: 500 });
    }

    const totalBalance = allWallets?.reduce((sum, w) => sum + parseFloat(w.balance || '0'), 0) || 0;
    const totalDeposited = allWallets?.reduce((sum, w) => sum + parseFloat(w.total_deposited || '0'), 0) || 0;
    const totalWithdrawn = allWallets?.reduce((sum, w) => sum + parseFloat(w.total_withdrawn || '0'), 0) || 0;

    // 5. Buscar depósitos do mês atual
    const { data: depositsThisMonth, error: depositsError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'deposit')
      .eq('status', 'completed')
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString());

    const totalDepositsThisMonth = depositsThisMonth?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    // 6. Buscar compras do mês atual
    const { data: purchasesThisMonth, error: purchasesError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'purchase')
      .eq('status', 'completed')
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString());

    const totalPurchasesThisMonth = purchasesThisMonth?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    // 7. Buscar comissões da plataforma (receita)
    const PLATFORM_EMAIL = 'platform@finance.com';
    const { data: platformProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', PLATFORM_EMAIL)
      .single();

    let platformRevenue = 0;
    if (platformProfile) {
      const { data: platformDeposits } = await supabaseAdmin
        .from('wallet_transactions')
        .select('amount')
        .eq('user_id', platformProfile.id)
        .eq('type', 'deposit')
        .eq('status', 'completed')
        .gte('created_at', firstDayOfMonth.toISOString())
        .lte('created_at', lastDayOfMonth.toISOString());

      platformRevenue = platformDeposits?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    }

    // 8. Calcular lucro bruto (Receita - Custos Operacionais)
    // Por enquanto, custos operacionais = 0 (pode ser implementado depois)
    const operationalCosts = 0;
    const grossProfit = platformRevenue - operationalCosts;

    // 9. Calcular taxa de estorno (chargeback rate)
    // Estornos = refunds + purchases cancelled
    const { data: refunds } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'refund')
      .eq('status', 'completed')
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString());

    const { data: cancelledPurchases } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'purchase')
      .eq('status', 'cancelled')
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString());

    const totalRefunds = (refunds?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0) +
                         (cancelledPurchases?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0);
    
    const totalSales = totalPurchasesThisMonth;
    const chargebackRate = totalSales > 0 ? (totalRefunds / totalSales) * 100 : 0;

    // 10. Calcular ticket médio (30 dias)
    const { data: purchases30Days } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'purchase')
      .eq('status', 'completed')
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', now.toISOString());

    const totalPurchases30Days = purchases30Days?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const purchaseCount30Days = purchases30Days?.length || 0;
    const averageTicket = purchaseCount30Days > 0 ? totalPurchases30Days / purchaseCount30Days : 0;

    // 11. Calcular ticket médio do mês anterior para comparação
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    const { data: purchasesPreviousMonth } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'purchase')
      .eq('status', 'completed')
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', previousMonthEnd.toISOString());

    const totalPurchasesPreviousMonth = purchasesPreviousMonth?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const purchaseCountPreviousMonth = purchasesPreviousMonth?.length || 0;
    const averageTicketPreviousMonth = purchaseCountPreviousMonth > 0 ? totalPurchasesPreviousMonth / purchaseCountPreviousMonth : 0;
    const ticketVariation = averageTicketPreviousMonth > 0 
      ? ((averageTicket - averageTicketPreviousMonth) / averageTicketPreviousMonth) * 100 
      : 0;

    // 12. Calcular receita bruta do mês anterior para comparação
    let platformRevenuePreviousMonth = 0;
    if (platformProfile) {
      const { data: platformDepositsPreviousMonth } = await supabaseAdmin
        .from('wallet_transactions')
        .select('amount')
        .eq('user_id', platformProfile.id)
        .eq('type', 'deposit')
        .eq('status', 'completed')
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString());

      platformRevenuePreviousMonth = platformDepositsPreviousMonth?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    }
    const revenueVariation = platformRevenuePreviousMonth > 0
      ? ((platformRevenue - platformRevenuePreviousMonth) / platformRevenuePreviousMonth) * 100
      : 0;

    // 13. Dados para gráfico de saldo (últimos 7 dias)
    // Calcular saldo histórico baseado nas transações diárias
    const balanceChartData = [];
    let runningBalance = totalBalance; // Começar com saldo atual
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Calcular variação do saldo neste dia (depósitos - saques - compras)
      const { data: dayTransactions } = await supabaseAdmin
        .from('wallet_transactions')
        .select('type, amount, status')
        .gte('created_at', date.toISOString())
        .lte('created_at', dayEnd.toISOString());

      let dayChange = 0;
      if (dayTransactions) {
        dayTransactions.forEach(tx => {
          if (tx.status === 'completed') {
            if (tx.type === 'deposit') {
              dayChange += parseFloat(tx.amount);
            } else if (tx.type === 'withdraw' || tx.type === 'purchase' || tx.type === 'boost' || tx.type === 'premium') {
              dayChange -= parseFloat(tx.amount);
            } else if (tx.type === 'refund') {
              dayChange += parseFloat(tx.amount);
            }
          }
        });
      }

      // Para o último dia, usar saldo atual; para os anteriores, subtrair as mudanças futuras
      if (i === 0) {
        runningBalance = totalBalance;
      } else {
        // Subtrair mudanças dos dias futuros para obter o saldo histórico
        runningBalance -= dayChange;
      }

      balanceChartData.push({
        date: date.toISOString().split('T')[0],
        balance: Math.max(0, runningBalance)
      });
    }

    // 14. Dados para gráfico de receita (últimos 30 dias)
    const revenueChartData = [];
    if (platformProfile) {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const { data: depositsDay } = await supabaseAdmin
          .from('wallet_transactions')
          .select('amount')
          .eq('user_id', platformProfile.id)
          .eq('type', 'deposit')
          .eq('status', 'completed')
          .gte('created_at', date.toISOString())
          .lte('created_at', dayEnd.toISOString());

        const dayRevenue = depositsDay?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
        revenueChartData.push({
          date: date.toISOString().split('T')[0],
          revenue: dayRevenue
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalBalance,
        totalDepositsThisMonth,
        totalPurchasesThisMonth,
        platformRevenue,
        operationalCosts,
        grossProfit,
        chargebackRate,
        averageTicket,
        ticketVariation,
        revenueVariation,
        balanceChartData,
        revenueChartData,
        period: {
          start: firstDayOfMonth.toISOString(),
          end: lastDayOfMonth.toISOString(),
          month: now.getMonth() + 1,
          year: now.getFullYear()
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar dados do dashboard',
      details: error.message 
    }, { status: 500 });
  }
}

