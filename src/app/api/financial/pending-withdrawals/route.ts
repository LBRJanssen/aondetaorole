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

// GET /api/financial/pending-withdrawals - Listar saques pendentes
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] GET /pending-withdrawals - Iniciando...');

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

    // 3. Buscar saques pendentes
    const { data: pendingWithdrawals, error: withdrawalsError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('type', 'withdraw')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (withdrawalsError) {
      console.error('❌ [API Financial] Erro ao buscar saques pendentes:', withdrawalsError);
      return NextResponse.json({ 
        error: 'Erro ao buscar saques pendentes',
        details: withdrawalsError.message 
      }, { status: 500 });
    }

    // 4. Buscar informações dos usuários
    const userIds = [...new Set((pendingWithdrawals || []).map(w => w.user_id))];
    const { data: userProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, email')
      .in('id', userIds);

    const userMap = new Map((userProfiles || []).map(u => [u.id, u]));

    // 5. Formatar dados
    const formatted = (pendingWithdrawals || []).map(w => {
      const user = userMap.get(w.user_id);
      return {
        id: w.id,
        userId: w.user_id,
        userName: user?.name || 'Usuário',
        userEmail: user?.email || '',
        amount: parseFloat(w.amount),
        description: w.description,
        balanceBefore: parseFloat(w.balance_before),
        balanceAfter: parseFloat(w.balance_after),
        createdAt: w.created_at,
        status: w.status
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        withdrawals: formatted,
        total: formatted.length,
        totalAmount: formatted.reduce((sum, w) => sum + w.amount, 0)
      }
    });

  } catch (error: any) {
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar saques pendentes',
      details: error.message 
    }, { status: 500 });
  }
}

// POST /api/financial/pending-withdrawals - Aprovar ou recusar saque
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] POST /pending-withdrawals - Iniciando...');

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

    // 3. Pegar dados do body
    const body = await request.json();
    const { transactionId, action, reason } = body; // action: 'approve' | 'reject'

    if (!transactionId || !action) {
      return NextResponse.json({ error: 'transactionId e action são obrigatórios' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action deve ser "approve" ou "reject"' }, { status: 400 });
    }

    // 4. Buscar transação
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('type', 'withdraw')
      .eq('status', 'pending')
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json({ error: 'Transação não encontrada ou já processada' }, { status: 404 });
    }

    // 5. Processar ação
    if (action === 'approve') {
      // Aprovar: manter status como completed (já foi descontado na criação)
      const { error: updateError } = await supabaseAdmin
        .from('wallet_transactions')
        .update({
          status: 'completed',
          description: transaction.description + ' (Aprovado)'
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('❌ [API Financial] Erro ao aprovar saque:', updateError);
        return NextResponse.json({ error: 'Erro ao aprovar saque' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Saque aprovado com sucesso'
      });

    } else if (action === 'reject') {
      // Rejeitar: reverter o desconto da carteira e marcar como cancelled
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', transaction.user_id)
        .single();

      if (wallet) {
        const currentBalance = parseFloat(wallet.balance) || 0;
        const newBalance = currentBalance + parseFloat(transaction.amount);
        const newTotalWithdrawn = Math.max(0, (parseFloat(wallet.total_withdrawn) || 0) - parseFloat(transaction.amount));

        // Reverter saldo
        await supabaseAdmin
          .from('wallets')
          .update({
            balance: newBalance,
            total_withdrawn: newTotalWithdrawn,
            updated_at: new Date().toISOString()
          })
          .eq('id', wallet.id);

        // Marcar transação como cancelled
        const { error: updateError } = await supabaseAdmin
          .from('wallet_transactions')
          .update({
            status: 'cancelled',
            description: transaction.description + (reason ? ` (Recusado: ${reason})` : ' (Recusado)')
          })
          .eq('id', transactionId);

        if (updateError) {
          console.error('❌ [API Financial] Erro ao recusar saque:', updateError);
          return NextResponse.json({ error: 'Erro ao recusar saque' }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Saque recusado e valor revertido com sucesso'
      });
    }

  } catch (error: any) {
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar ação',
      details: error.message 
    }, { status: 500 });
  }
}

