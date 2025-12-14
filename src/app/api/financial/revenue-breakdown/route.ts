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

// GET /api/financial/revenue-breakdown - Análise de receita por fonte
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] GET /revenue-breakdown - Iniciando...');

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

    // 3. Pegar parâmetros de data
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    if (startParam && endParam) {
      startDate = new Date(startParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Padrão: mês atual
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // 4. Buscar usuário da plataforma
    const PLATFORM_EMAIL = 'platform@finance.com';
    const { data: platformProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', PLATFORM_EMAIL)
      .single();

    let platformUserId: string | null = null;
    if (platformProfile) {
      platformUserId = platformProfile.id;
    } else {
      // Fallback: buscar no auth.users
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const platformUser = users?.find(u => u.email === PLATFORM_EMAIL);
      if (platformUser) {
        platformUserId = platformUser.id;
      }
    }

    // 5. Receita de BOOSTS (total vendido)
    const { data: boostTransactions } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'boost')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const boostRevenue = boostTransactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    // 6. Receita de PREMIUM (transações de premium no período)
    // Usar transações da carteira que são do tipo 'premium'
    const { data: premiumTransactions } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'premium')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const premiumRevenue = premiumTransactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    // Buscar assinaturas ativas para contar
    const { data: premiumSubscriptions } = await supabaseAdmin
      .from('premium_subscriptions')
      .select(`
        *,
        premium_plans:plan_id (
          name,
          total_price,
          price_per_month
        )
      `)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString());

    let activeSubscriptions = premiumSubscriptions?.length || 0;
    let premiumByPlan: { [key: string]: number } = {};

    // Calcular por plano usando transações
    if (premiumSubscriptions && premiumTransactions) {
      // Buscar detalhes das transações de premium para agrupar por plano
      const { data: premiumTxDetails } = await supabaseAdmin
        .from('wallet_transactions')
        .select('amount, reference_id, created_at')
        .eq('type', 'premium')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (premiumTxDetails) {
        // Agrupar por subscription_id (reference_id)
        const txBySubscription = new Map<string, number>();
        premiumTxDetails.forEach(tx => {
          if (tx.reference_id) {
            const current = txBySubscription.get(tx.reference_id) || 0;
            txBySubscription.set(tx.reference_id, current + parseFloat(tx.amount));
          }
        });

        // Mapear para planos
        premiumSubscriptions.forEach(sub => {
          const plan = sub.premium_plans as any;
          if (plan && txBySubscription.has(sub.id)) {
            const planName = plan.name || 'unknown';
            const amount = txBySubscription.get(sub.id) || 0;
            premiumByPlan[planName] = (premiumByPlan[planName] || 0) + amount;
          }
        });
      }
    }

    // 7. Receita de INGRESSOS (comissão da plataforma - 10%)
    // A plataforma recebe 10% de cada venda de ingresso
    const PLATFORM_COMMISSION_PERCENT = 10;
    
    let ticketRevenue = 0;
    let totalTicketSales = 0;
    let ticketCount = 0;

    if (platformUserId) {
      // Buscar depósitos na carteira da plataforma que são comissões de ingressos
      const { data: platformDeposits } = await supabaseAdmin
        .from('wallet_transactions')
        .select('amount, description, reference_id, reference_type')
        .eq('user_id', platformUserId)
        .eq('type', 'deposit')
        .eq('status', 'completed')
        .like('description', '%Comissão%')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      ticketRevenue = platformDeposits?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      // Buscar compras de ingressos para calcular total vendido
      const { data: ticketPurchases } = await supabaseAdmin
        .from('wallet_transactions')
        .select('amount')
        .eq('type', 'purchase')
        .eq('status', 'completed')
        .eq('reference_type', 'ticket')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      totalTicketSales = ticketPurchases?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      ticketCount = ticketPurchases?.length || 0;
    }

    // 8. Receita de DEPÓSITOS (valor total depositado pelos usuários)
    // Não é realmente receita da plataforma, mas é fluxo de entrada
    const { data: deposits } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'deposit')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalDeposits = deposits?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    // 9. Calcular total de receita
    const totalRevenue = boostRevenue + premiumRevenue + ticketRevenue;

    // 10. Calcular percentuais
    const boostPercent = totalRevenue > 0 ? (boostRevenue / totalRevenue) * 100 : 0;
    const premiumPercent = totalRevenue > 0 ? (premiumRevenue / totalRevenue) * 100 : 0;
    const ticketPercent = totalRevenue > 0 ? (ticketRevenue / totalRevenue) * 100 : 0;

    // 11. Dados para gráfico mensal (últimos 6 meses)
    const monthlyData = [];
    const monthsToShow = 6;
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      // Boost revenue
      const { data: monthBoosts } = await supabaseAdmin
        .from('wallet_transactions')
        .select('amount')
        .eq('type', 'boost')
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const monthBoostRevenue = monthBoosts?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      // Premium revenue (usar transações do mês)
      const { data: monthPremiumTx } = await supabaseAdmin
        .from('wallet_transactions')
        .select('amount')
        .eq('type', 'premium')
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const monthPremiumRevenue = monthPremiumTx?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      // Ticket revenue
      let monthTicketRevenue = 0;
      if (platformUserId) {
        const { data: monthPlatformDeposits } = await supabaseAdmin
          .from('wallet_transactions')
          .select('amount')
          .eq('user_id', platformUserId)
          .eq('type', 'deposit')
          .eq('status', 'completed')
          .like('description', '%Comissão%')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        monthTicketRevenue = monthPlatformDeposits?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      }

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      monthlyData.push({
        month: monthDate.getMonth() + 1,
        year: monthDate.getFullYear(),
        label: `${monthNames[monthDate.getMonth()]}/${monthDate.getFullYear()}`,
        boost: monthBoostRevenue,
        premium: monthPremiumRevenue,
        tickets: monthTicketRevenue,
        total: monthBoostRevenue + monthPremiumRevenue + monthTicketRevenue
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalRevenue,
          boostRevenue,
          premiumRevenue,
          ticketRevenue,
          totalDeposits,
          totalTicketSales,
          ticketCount,
          activeSubscriptions
        },
        percentages: {
          boost: boostPercent,
          premium: premiumPercent,
          tickets: ticketPercent
        },
        premiumByPlan,
        monthlyTrend: monthlyData
      }
    });

  } catch (error: any) {
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar breakdown de receita',
      details: error.message 
    }, { status: 500 });
  }
}

