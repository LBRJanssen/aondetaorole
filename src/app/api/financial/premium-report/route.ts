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

// GET /api/financial/premium-report - Relatório de Premium/MRR
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] GET /premium-report - Iniciando...');

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

    // 3. Pegar parâmetros
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

    // 4. Buscar todas as assinaturas ativas
    const { data: activeSubscriptions, error: activeError } = await supabaseAdmin
      .from('premium_subscriptions')
      .select(`
        *,
        premium_plans:plan_id (
          name,
          display_name,
          price_per_month,
          total_price,
          duration_months,
          boost_discount_percent
        )
      `)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    if (activeError) {
      console.error('❌ [API Financial] Erro ao buscar assinaturas:', activeError);
      return NextResponse.json({ error: 'Erro ao buscar assinaturas premium' }, { status: 500 });
    }

    // 5. Buscar todas as assinaturas (para histórico)
    const { data: allSubscriptions, error: allError } = await supabaseAdmin
      .from('premium_subscriptions')
      .select(`
        *,
        premium_plans:plan_id (
          name,
          display_name,
          price_per_month,
          total_price
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // 6. Buscar transações de premium no período
    const { data: premiumTransactions, error: txError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('type', 'premium')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // 7. Calcular MRR (Monthly Recurring Revenue)
    let mrr = 0;
    const mrrByPlan: { [key: string]: number } = {};

    activeSubscriptions?.forEach(sub => {
      const plan = sub.premium_plans as any;
      if (plan) {
        const monthlyPrice = parseFloat(plan.price_per_month || plan.total_price || '0');
        mrr += monthlyPrice;

        const planName = plan.name || 'unknown';
        mrrByPlan[planName] = (mrrByPlan[planName] || 0) + monthlyPrice;
      }
    });

    // 8. Receita do período (transações)
    const periodRevenue = premiumTransactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    // 9. Assinaturas por plano
    const subscriptionsByPlan: { [key: string]: number } = {};
    activeSubscriptions?.forEach(sub => {
      const plan = sub.premium_plans as any;
      if (plan) {
        const planName = plan.name || 'unknown';
        subscriptionsByPlan[planName] = (subscriptionsByPlan[planName] || 0) + 1;
      }
    });

    // 10. Calcular churn rate
    // Buscar assinaturas canceladas no período
    const { data: cancelledSubscriptions } = await supabaseAdmin
      .from('premium_subscriptions')
      .select('id, created_at, premium_plans:plan_id (price_per_month)')
      .eq('status', 'cancelled')
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString());

    // Assinaturas ativas no início do período (aproximação)
    const { data: activeAtStart } = await supabaseAdmin
      .from('premium_subscriptions')
      .select('id')
      .eq('status', 'active')
      .lte('created_at', startDate.toISOString());

    const activeCountAtStart = activeAtStart?.length || 1; // Evitar divisão por zero
    const cancelledCount = cancelledSubscriptions?.length || 0;
    const churnRate = (cancelledCount / activeCountAtStart) * 100;

    // 11. Novas assinaturas no período
    const newSubscriptions = allSubscriptions?.filter(sub => {
      const created = new Date(sub.created_at);
      return created >= startDate && created <= endDate;
    }) || [];

    // 12. Receita por mês (últimos 6 meses)
    const monthlyRevenue = [];
    const monthsToShow = 6;
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const { data: monthTx } = await supabaseAdmin
        .from('wallet_transactions')
        .select('amount')
        .eq('type', 'premium')
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const monthRevenue = monthTx?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      // Calcular MRR do mês
      const { data: monthActive } = await supabaseAdmin
        .from('premium_subscriptions')
        .select(`
          premium_plans:plan_id (price_per_month)
        `)
        .eq('status', 'active')
        .lte('created_at', monthEnd.toISOString())
        .gt('expires_at', monthStart.toISOString());

      const monthMRR = monthActive?.reduce((sum, sub: any) => {
        const plan = sub.premium_plans;
        return sum + (parseFloat(plan?.price_per_month || '0'));
      }, 0) || 0;

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      monthlyRevenue.push({
        month: monthDate.getMonth() + 1,
        year: monthDate.getFullYear(),
        label: `${monthNames[monthDate.getMonth()]}/${monthDate.getFullYear()}`,
        revenue: monthRevenue,
        mrr: monthMRR
      });
    }

    // 13. Planos disponíveis
    const { data: availablePlans } = await supabaseAdmin
      .from('premium_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          mrr,
          periodRevenue,
          activeSubscriptions: activeSubscriptions?.length || 0,
          newSubscriptions: newSubscriptions.length,
          cancelledSubscriptions: cancelledCount,
          churnRate
        },
        mrrByPlan,
        subscriptionsByPlan,
        monthlyTrend: monthlyRevenue,
        availablePlans: availablePlans || []
      }
    });

  } catch (error: any) {
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar relatório de premium',
      details: error.message 
    }, { status: 500 });
  }
}




