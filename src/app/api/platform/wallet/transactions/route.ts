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

// POST /api/platform/wallet/transactions - Obter histórico de transações das carteiras da plataforma
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Platform] POST /wallet/transactions - Iniciando...');

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
    const body = await request.json();
    const { page = 1, limit = 20, walletType, startDate, endDate } = body;

    // 4. Construir query em platform_transactions
    let query = supabaseAdmin
      .from('platform_transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (walletType) {
      query = query.eq('wallet_type', walletType);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', new Date(endDate).toISOString());
    }

    const { data: transactions, error: transactionsError, count } = await query;

    if (transactionsError) {
      console.error('❌ [API Platform] Erro ao buscar transações:', transactionsError);
      return NextResponse.json({ error: 'Erro ao buscar transações' }, { status: 500 });
    }

    // Transformar transações para o formato esperado pelo componente
    const formattedTransactions = transactions?.map(tx => ({
      id: tx.id,
      type: tx.wallet_type === 'boost' ? 'boost' : 'deposit',
      amount: parseFloat(tx.commission_amount),
      description: tx.description,
      balance_before: parseFloat(tx.balance_before),
      balance_after: parseFloat(tx.balance_after),
      created_at: tx.created_at,
      status: tx.status,
      wallet_type: tx.wallet_type
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Platform] Erro ao buscar transações:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar histórico',
      details: error.message 
    }, { status: 500 });
  }
}


