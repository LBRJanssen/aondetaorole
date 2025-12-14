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

// GET /api/financial/cashflow - Fluxo de caixa mensal (últimos 6 meses)
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] GET /cashflow - Iniciando...');

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

    // 3. Calcular meses (usar filtros de data se fornecidos, senão usar últimos 6 meses)
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    const now = new Date();
    const months: Array<{ month: number; year: number; label: string; start: Date; end: Date }> = [];

    if (startParam && endParam) {
      // Usar range personalizado
      const startDate = new Date(startParam);
      const endDate = new Date(endParam);
      
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const finalEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0, 23, 59, 59);
      
      while (current <= finalEnd) {
        const month = current.getMonth();
        const year = current.getFullYear();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
        
        // Ajustar para o range fornecido
        const actualStart = monthStart < startDate ? startDate : monthStart;
        const actualEnd = monthEnd > endDate ? endDate : monthEnd;
        
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const label = `${monthNames[month]}/${year}`;
        
        months.push({ month: month + 1, year, label, start: actualStart, end: actualEnd });
        
        // Próximo mês
        current = new Date(year, month + 1, 1);
      }
    } else {
      // Comportamento padrão: últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.getMonth();
        const year = date.getFullYear();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59);

        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const label = `${monthNames[month]}/${year}`;

        months.push({ month: month + 1, year, label, start, end });
      }
    }

    // 4. Buscar receitas (depósitos) e despesas (saques) por mês
    const cashflowData = await Promise.all(
      months.map(async ({ month, year, label, start, end }) => {
        // Receitas (depósitos completados)
        const { data: deposits } = await supabaseAdmin
          .from('wallet_transactions')
          .select('amount')
          .eq('type', 'deposit')
          .eq('status', 'completed')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        const revenue = deposits?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

        // Despesas (saques completados)
        const { data: withdrawals } = await supabaseAdmin
          .from('wallet_transactions')
          .select('amount')
          .eq('type', 'withdraw')
          .eq('status', 'completed')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        const expenses = withdrawals?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

        // Lucro líquido (Receita - Despesas)
        const netProfit = revenue - expenses;

        return {
          month,
          year,
          label,
          revenue,
          expenses,
          netProfit
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        cashflow: cashflowData,
        summary: {
          totalRevenue: cashflowData.reduce((sum, m) => sum + m.revenue, 0),
          totalExpenses: cashflowData.reduce((sum, m) => sum + m.expenses, 0),
          totalNetProfit: cashflowData.reduce((sum, m) => sum + m.netProfit, 0)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar fluxo de caixa',
      details: error.message 
    }, { status: 500 });
  }
}

