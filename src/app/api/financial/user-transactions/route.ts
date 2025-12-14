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

// GET /api/financial/user-transactions - Buscar transações de um usuário específico
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] GET /user-transactions - Iniciando...');

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

    // 3. Pegar parâmetros da query
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId && !userName) {
      return NextResponse.json({ error: 'userId ou userName é obrigatório' }, { status: 400 });
    }

    // 4. Buscar usuário por ID ou nome
    let targetUserId: string | null = null;

    if (userId) {
      targetUserId = userId;
    } else if (userName) {
      const { data: userProfiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .ilike('name', `%${userName}%`)
        .limit(1);

      if (!userProfiles || userProfiles.length === 0) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }

      targetUserId = userProfiles[0].id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 5. Buscar perfil do usuário
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, email')
      .eq('id', targetUserId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 6. Buscar carteira do usuário
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('user_id', targetUserId)
      .single();

    const currentBalance = wallet ? parseFloat(wallet.balance || '0') : 0;

    // 7. Buscar transações
    let query = supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', targetUserId);
    
    // Aplicar filtros de data se fornecidos
    if (startParam) {
      const startDate = new Date(startParam);
      startDate.setHours(0, 0, 0, 0);
      query = query.gte('created_at', startDate.toISOString());
    }
    
    if (endParam) {
      const endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }
    
    const { data: transactions, error: transactionsError, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (transactionsError) {
      console.error('❌ [API Financial] Erro ao buscar transações:', transactionsError);
      return NextResponse.json({ error: 'Erro ao buscar transações' }, { status: 500 });
    }

    // 8. Formatar transações para extrato
    const formattedTransactions = (transactions || []).map(tx => ({
      id: tx.id,
      date: tx.created_at,
      description: tx.description,
      amount: parseFloat(tx.amount),
      balanceBefore: parseFloat(tx.balance_before),
      balanceAfter: parseFloat(tx.balance_after),
      type: tx.type,
      status: tx.status
    }));

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          currentBalance
        },
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
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar transações do usuário',
      details: error.message 
    }, { status: 500 });
  }
}

