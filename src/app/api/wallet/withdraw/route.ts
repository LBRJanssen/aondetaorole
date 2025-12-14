import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/wallet/withdraw - Sacar da carteira
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Wallet] POST /withdraw - Iniciando...');

    // 1. Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API Wallet] Token não fornecido');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // 2. Verificar token e pegar usuário
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.log('❌ [API Wallet] Token inválido:', authError?.message);
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    console.log('🔐 [API Wallet] Usuário autenticado:', user.id);

    // 3. Pegar dados do body
    const body = await request.json();
    const { amount, description, pixKey } = body;

    // 4. Validar amount
    if (!amount || isNaN(amount) || amount <= 0) {
      console.log('❌ [API Wallet] Valor inválido:', amount);
      return NextResponse.json({ error: 'Valor deve ser maior que 0' }, { status: 400 });
    }

    // 5. Validar valor mínimo de saque
    if (amount < 10) {
      console.log('❌ [API Wallet] Valor muito baixo:', amount);
      return NextResponse.json({ error: 'Valor mínimo para saque é R$ 10,00' }, { status: 400 });
    }

    const withdrawAmount = parseFloat(amount.toFixed(2));
    console.log('💰 [API Wallet] Valor do saque:', withdrawAmount);

    // 6. Buscar carteira
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError) {
      if (walletError.code === 'PGRST116') {
        console.log('❌ [API Wallet] Carteira não encontrada');
        return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 });
      }
      console.error('❌ [API Wallet] Erro ao buscar carteira:', walletError);
      return NextResponse.json({ error: 'Erro ao buscar carteira' }, { status: 500 });
    }

    const balanceBefore = parseFloat(wallet.balance) || 0;

    // 7. Verificar saldo suficiente
    if (balanceBefore < withdrawAmount) {
      console.log('❌ [API Wallet] Saldo insuficiente:', balanceBefore, '<', withdrawAmount);
      return NextResponse.json({ 
        error: 'Saldo insuficiente',
        details: {
          balance: balanceBefore,
          requested: withdrawAmount
        }
      }, { status: 400 });
    }

    const balanceAfter = balanceBefore - withdrawAmount;
    const newTotalWithdrawn = (parseFloat(wallet.total_withdrawn) || 0) + withdrawAmount;

    console.log('📊 [API Wallet] Saldo antes:', balanceBefore, '| Saldo depois:', balanceAfter);

    // 8. Atualizar carteira
    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: balanceAfter,
        total_withdrawn: newTotalWithdrawn,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('❌ [API Wallet] Erro ao atualizar carteira:', updateError);
      return NextResponse.json({ error: 'Erro ao processar saque' }, { status: 500 });
    }

    // 9. Criar registro de transação
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        type: 'withdraw',
        amount: withdrawAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: description || `Saque via PIX${pixKey ? ` (${pixKey})` : ''}`,
        status: 'pending' // Saques começam como pendentes até serem processados
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ [API Wallet] Erro ao criar transação:', transactionError);
      // Reverter atualização da carteira
      await supabaseAdmin
        .from('wallets')
        .update({
          balance: balanceBefore,
          total_withdrawn: parseFloat(wallet.total_withdrawn) || 0
        })
        .eq('id', wallet.id);
      return NextResponse.json({ error: 'Erro ao registrar transação' }, { status: 500 });
    }

    console.log('✅ [API Wallet] Saque solicitado com sucesso:', transaction.id);

    // 10. Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Saque solicitado com sucesso. O valor será transferido em até 24 horas.',
      data: {
        transactionId: transaction.id,
        amount: withdrawAmount,
        balanceBefore,
        balanceAfter,
        status: 'pending',
        currency: 'BRL'
      }
    });

  } catch (error: any) {
    console.error('❌ [API Wallet] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

