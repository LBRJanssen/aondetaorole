import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/wallet/deposit - Depositar na carteira
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Wallet] POST /deposit - Iniciando...');

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
    const { amount, description } = body;

    // 4. Validar amount
    if (!amount || isNaN(amount) || amount <= 0) {
      console.log('❌ [API Wallet] Valor inválido:', amount);
      return NextResponse.json({ error: 'Valor deve ser maior que 0' }, { status: 400 });
    }

    if (amount > 10000) {
      console.log('❌ [API Wallet] Valor muito alto:', amount);
      return NextResponse.json({ error: 'Valor máximo por depósito é R$ 10.000,00' }, { status: 400 });
    }

    const depositAmount = parseFloat(amount.toFixed(2));
    console.log('💰 [API Wallet] Valor do depósito:', depositAmount);

    // 5. Buscar ou criar carteira (apenas carteiras do tipo 'user')
    let { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('wallet_type', 'user')
      .single();

    if (walletError && walletError.code === 'PGRST116') {
      console.log('⚠️ [API Wallet] Carteira não existe, criando...');
      
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({ 
          user_id: user.id,
          wallet_type: 'user',
          balance: 0.00,
          total_deposited: 0.00,
          total_withdrawn: 0.00
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [API Wallet] Erro ao criar carteira:', createError);
        return NextResponse.json({ error: 'Erro ao criar carteira' }, { status: 500 });
      }

      wallet = newWallet;
    } else if (walletError) {
      console.error('❌ [API Wallet] Erro ao buscar carteira:', walletError);
      return NextResponse.json({ error: 'Erro ao buscar carteira' }, { status: 500 });
    }

    const balanceBefore = parseFloat(wallet.balance) || 0;
    const balanceAfter = balanceBefore + depositAmount;
    const newTotalDeposited = (parseFloat(wallet.total_deposited) || 0) + depositAmount;

    console.log('📊 [API Wallet] Saldo antes:', balanceBefore, '| Saldo depois:', balanceAfter);

    // 6. Atualizar carteira
    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: balanceAfter,
        total_deposited: newTotalDeposited,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('❌ [API Wallet] Erro ao atualizar carteira:', updateError);
      return NextResponse.json({ error: 'Erro ao processar depósito' }, { status: 500 });
    }

    // 7. Criar registro de transação
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        type: 'deposit',
        amount: depositAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: description || 'Depósito na carteira',
        status: 'completed'
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
          total_deposited: parseFloat(wallet.total_deposited) || 0
        })
        .eq('id', wallet.id);
      return NextResponse.json({ error: 'Erro ao registrar transação' }, { status: 500 });
    }

    console.log('✅ [API Wallet] Depósito realizado com sucesso:', transaction.id);

    // 8. Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Depósito realizado com sucesso',
      data: {
        transactionId: transaction.id,
        amount: depositAmount,
        balanceBefore,
        balanceAfter,
        currency: 'BRL'
      }
    });

  } catch (error: any) {
    console.error('❌ [API Wallet] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

