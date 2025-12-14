import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Email do usuário plataforma
const PLATFORM_EMAIL = 'platform@finance.com';

// Configuração de preços (fallback caso não tenha no banco)
const BOOST_PRICES = {
  '12h': { price: 0.20, durationHours: 12 },
  '24h': { price: 0.40, durationHours: 24 }
};

// POST /api/boost/buy - Comprar e aplicar boost em um evento
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Boost] POST /buy - Iniciando...');

    // 1. Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API Boost] Token não fornecido');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.log('❌ [API Boost] Token inválido');
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    console.log('🔐 [API Boost] Usuário:', user.id);

    // 2. Pegar dados do body
    const body = await request.json();
    const { eventId, boostType, paymentMethod, quantity = 1 } = body;

    // 3. Validações
    if (!eventId) {
      return NextResponse.json({ error: 'eventId é obrigatório' }, { status: 400 });
    }

    if (!boostType || !['12h', '24h'].includes(boostType)) {
      return NextResponse.json({ error: 'boostType deve ser "12h" ou "24h"' }, { status: 400 });
    }

    if (!paymentMethod || !['wallet', 'pix', 'credit_card'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'paymentMethod deve ser "wallet", "pix" ou "credit_card"' }, { status: 400 });
    }

    if (quantity < 1) {
      return NextResponse.json({ error: 'Quantidade deve ser no mínimo 1' }, { status: 400 });
    }

    // 4. Verificar se evento existe
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, name, organizer_id, is_active')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.log('❌ [API Boost] Evento não encontrado:', eventId);
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    if (!event.is_active) {
      return NextResponse.json({ error: 'Evento não está ativo' }, { status: 400 });
    }

    console.log('📍 [API Boost] Evento:', event.name);

    // 5. Buscar preço do boost
    let boostConfig = BOOST_PRICES[boostType as keyof typeof BOOST_PRICES];
    
    const { data: dbConfig } = await supabaseAdmin
      .from('boost_config')
      .select('price, duration_hours')
      .eq('boost_type', boostType)
      .eq('is_active', true)
      .single();

    if (dbConfig) {
      boostConfig = {
        price: parseFloat(dbConfig.price),
        durationHours: dbConfig.duration_hours
      };
    }

    // 5.1. Verificar desconto premium
    let premiumDiscount = 0;
    const { data: subscription } = await supabaseAdmin
      .from('premium_subscriptions')
      .select(`
        *,
        premium_plans:plan_id (
          name,
          boost_discount_percent
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (subscription && subscription.premium_plans) {
      const plan = subscription.premium_plans as any;
      premiumDiscount = plan.boost_discount_percent || 0;
      console.log('🎯 [API Boost] Desconto premium:', premiumDiscount + '%');
    }

    const basePrice = boostConfig.price * quantity;
    const discountAmount = basePrice * (premiumDiscount / 100);
    const totalPrice = basePrice - discountAmount;
    
    console.log('💰 [API Boost] Preço base:', basePrice, '| Desconto:', discountAmount, '| Total:', totalPrice);

    // 6. Processar pagamento
    let walletTransactionId: string | null = null;

    if (paymentMethod === 'wallet') {
      // Buscar carteira do usuário
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError || !wallet) {
        console.log('❌ [API Boost] Carteira não encontrada');
        return NextResponse.json({ 
          error: 'Carteira não encontrada. Faça um depósito primeiro ou escolha outro método de pagamento.',
          code: 'WALLET_NOT_FOUND'
        }, { status: 400 });
      }

      const balance = parseFloat(wallet.balance) || 0;

      if (balance < totalPrice) {
        console.log('❌ [API Boost] Saldo insuficiente:', balance, '<', totalPrice);
        return NextResponse.json({ 
          error: 'Saldo insuficiente na carteira',
          code: 'INSUFFICIENT_BALANCE',
          details: {
            balance,
            required: totalPrice,
            missing: totalPrice - balance
          }
        }, { status: 400 });
      }

      // Descontar da carteira
      const newBalance = balance - totalPrice;

      const { error: updateError } = await supabaseAdmin
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (updateError) {
        console.error('❌ [API Boost] Erro ao descontar wallet:', updateError);
        return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
      }

      // Criar transação na wallet
      const description = premiumDiscount > 0 
        ? `Boost ${boostType} x${quantity} - ${event.name} (${premiumDiscount}% OFF Premium)`
        : `Boost ${boostType} x${quantity} - ${event.name}`;
      
      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          type: 'boost',
          amount: totalPrice,
          balance_before: balance,
          balance_after: newBalance,
          description,
          reference_id: eventId,
          reference_type: 'event',
          status: 'completed'
        })
        .select()
        .single();

      if (transactionError) {
        console.error('❌ [API Boost] Erro ao criar transação:', transactionError);
        // Reverter
        await supabaseAdmin
          .from('wallets')
          .update({ balance })
          .eq('id', wallet.id);
        return NextResponse.json({ error: 'Erro ao registrar transação' }, { status: 500 });
      }

      walletTransactionId = transaction.id;
      console.log('✅ [API Boost] Pagamento wallet OK:', walletTransactionId);

    } else if (paymentMethod === 'pix' || paymentMethod === 'credit_card') {
      // TODO: Integrar com gateway de pagamento (Stripe, PagSeguro, etc)
      // Por enquanto, vamos simular que o pagamento foi aprovado
      console.log('⚠️ [API Boost] Pagamento', paymentMethod, '- SIMULADO (integrar gateway)');
    }

    // 6.1. Creditar 100% do valor na carteira da plataforma (platform_boost)
    // Buscar ID do usuário plataforma
    let platformUserId: string | null = null;
    const { data: platformUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', PLATFORM_EMAIL)
      .single();

    if (platformUser) {
      platformUserId = platformUser.id;

      // Buscar carteira específica de boost da plataforma
      let { data: platformBoostWallet, error: platformWalletError } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', platformUserId)
        .eq('wallet_type', 'platform_boost')
        .single();

      if (platformWalletError && platformWalletError.code === 'PGRST116') {
        // Criar carteira se não existir
        const { data: newWallet, error: createError } = await supabaseAdmin
          .from('wallets')
          .insert({ 
            user_id: platformUserId,
            wallet_type: 'platform_boost',
            balance: 0.00,
            total_deposited: 0.00,
            total_withdrawn: 0.00
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ [API Boost] Erro ao criar carteira platform_boost:', createError);
        } else {
          platformBoostWallet = newWallet;
        }
      }

      if (platformBoostWallet && !platformWalletError) {
        const platformBalanceBefore = parseFloat(platformBoostWallet.balance) || 0;
        const platformBalanceAfter = platformBalanceBefore + totalPrice;
        const platformTotalDeposited = (parseFloat(platformBoostWallet.total_deposited) || 0) + totalPrice;

        const { error: updatePlatformError } = await supabaseAdmin
          .from('wallets')
          .update({
            balance: platformBalanceAfter,
            total_deposited: platformTotalDeposited,
            updated_at: new Date().toISOString()
          })
          .eq('id', platformBoostWallet.id);

        if (updatePlatformError) {
          console.error('❌ [API Boost] Erro ao creditar plataforma:', updatePlatformError);
          // Não falha a compra, apenas log
        } else {
          // Criar transação na tabela platform_transactions
          const description = premiumDiscount > 0 
            ? `Boost ${boostType} x${quantity} - ${event.name} (${premiumDiscount}% OFF Premium)`
            : `Boost ${boostType} x${quantity} - ${event.name}`;

          await supabaseAdmin
            .from('platform_transactions')
            .insert({
              platform_wallet_id: platformBoostWallet.id,
              wallet_type: 'boost',
              original_transaction_id: walletTransactionId,
              original_user_id: user.id,
              original_event_id: eventId,
              commission_amount: totalPrice, // 100% do valor (não é comissão, é o valor total)
              total_amount: totalPrice,
              commission_percentage: 100.00, // 100% vai para plataforma
              balance_before: platformBalanceBefore,
              balance_after: platformBalanceAfter,
              description: description,
              status: 'completed',
              metadata: {
                boost_type: boostType,
                quantity: quantity,
                event_name: event.name,
                premium_discount: premiumDiscount,
                discount_amount: discountAmount,
                base_price: basePrice
              }
            });

          console.log('✅ [API Boost] Valor total creditado na carteira platform_boost:', totalPrice);
        }
      }
    }

    // 7. Criar os boosts
    const now = new Date();
    const expiresAt = new Date(now.getTime() + boostConfig.durationHours * 60 * 60 * 1000);

    const boostsToInsert = Array(quantity).fill(null).map(() => ({
      event_id: eventId,
      user_id: user.id,
      boost_type: boostType,
      price: boostConfig.price,
      duration_hours: boostConfig.durationHours,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true,
      payment_method: paymentMethod,
      wallet_transaction_id: walletTransactionId
    }));

    const { data: boosts, error: boostError } = await supabaseAdmin
      .from('event_boosts')
      .insert(boostsToInsert)
      .select();

    if (boostError) {
      console.error('❌ [API Boost] Erro ao criar boosts:', boostError);
      // Reverter pagamento se foi via wallet
      if (walletTransactionId) {
        // Buscar transação para reverter
        const { data: tx } = await supabaseAdmin
          .from('wallet_transactions')
          .select('wallet_id, balance_before')
          .eq('id', walletTransactionId)
          .single();
        
        if (tx) {
          await supabaseAdmin
            .from('wallets')
            .update({ balance: tx.balance_before })
            .eq('id', tx.wallet_id);
          
          await supabaseAdmin
            .from('wallet_transactions')
            .update({ status: 'cancelled' })
            .eq('id', walletTransactionId);
        }
      }
      return NextResponse.json({ error: 'Erro ao aplicar boosts' }, { status: 500 });
    }

    // 8. Contar boosts ativos do evento
    const { data: activeBoosts } = await supabaseAdmin
      .from('event_boosts')
      .select('id', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('is_active', true)
      .gt('expires_at', now.toISOString());

    const totalActiveBoosts = activeBoosts?.length || 0;

    console.log('✅ [API Boost] Boosts criados:', quantity, '| Total ativos:', totalActiveBoosts);

    // 9. Retornar sucesso
    return NextResponse.json({
      success: true,
      message: `${quantity} boost(s) aplicado(s) com sucesso!${premiumDiscount > 0 ? ` Você economizou R$ ${discountAmount.toFixed(2)} com Premium!` : ''}`,
      data: {
        boostIds: boosts?.map(b => b.id) || [],
        quantity,
        boostType,
        basePrice: boostConfig.price,
        baseTotalPrice: basePrice,
        premiumDiscount,
        discountAmount,
        totalPrice,
        durationHours: boostConfig.durationHours,
        expiresAt: expiresAt.toISOString(),
        eventId,
        eventName: event.name,
        totalActiveBoosts,
        paymentMethod
      }
    });

  } catch (error: any) {
    console.error('❌ [API Boost] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

