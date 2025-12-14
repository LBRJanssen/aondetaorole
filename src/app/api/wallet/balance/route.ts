import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/wallet/balance - Retorna saldo da carteira
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Wallet] GET /balance - Iniciando...');

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

    // 3. Buscar carteira do usuário (apenas carteiras do tipo 'user')
    let { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('wallet_type', 'user')
      .single();

    // 4. Se não existe carteira, criar uma (com wallet_type = 'user')
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
        return NextResponse.json({ 
          error: 'Erro ao criar carteira',
          details: createError.message 
        }, { status: 500 });
      }

      wallet = newWallet;
      console.log('✅ [API Wallet] Carteira criada:', wallet.id);
    } else if (walletError) {
      console.error('❌ [API Wallet] Erro ao buscar carteira:', walletError);
      return NextResponse.json({ 
        error: 'Erro ao buscar carteira',
        details: walletError.message 
      }, { status: 500 });
    }

    // 5. Retornar saldo
    console.log('✅ [API Wallet] Saldo retornado:', wallet.balance);
    
    return NextResponse.json({
      success: true,
      data: {
        id: wallet.id,
        balance: parseFloat(wallet.balance) || 0,
        totalDeposited: parseFloat(wallet.total_deposited) || 0,
        totalWithdrawn: parseFloat(wallet.total_withdrawn) || 0,
        currency: 'BRL',
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });

  } catch (error: any) {
    console.error('❌ [API Wallet] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

