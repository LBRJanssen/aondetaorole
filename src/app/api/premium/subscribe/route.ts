import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/premium/subscribe - Assinar premium
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Premium] POST /subscribe - Iniciando...');

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

    console.log('🔐 [API Premium] Usuário:', user.id);

    // 2. Pegar dados do body
    const body = await request.json();
    const { planName, paymentMethod, autoRenew = false } = body;

    // 3. Validações
    if (!planName || !['basic', 'pro', 'max'].includes(planName)) {
      return NextResponse.json({ error: 'planName deve ser basic, pro ou max' }, { status: 400 });
    }

    if (!paymentMethod || !['wallet', 'pix', 'credit_card'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'paymentMethod deve ser wallet, pix ou credit_card' }, { status: 400 });
    }

    // 4. Verificar se já tem assinatura ativa
    const { data: existingSub } = await supabaseAdmin
      .from('premium_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingSub) {
      return NextResponse.json({ 
        error: 'Você já possui uma assinatura ativa',
        code: 'ALREADY_SUBSCRIBED',
        details: {
          expiresAt: existingSub.expires_at
        }
      }, { status: 400 });
    }

    // 5. Buscar plano
    const { data: plan, error: planError } = await supabaseAdmin
      .from('premium_plans')
      .select('*')
      .eq('name', planName)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.log('❌ [API Premium] Plano não encontrado:', planName);
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    const totalPrice = parseFloat(plan.total_price);
    console.log('💰 [API Premium] Plano:', plan.display_name, '| Preço:', totalPrice);

    // 6. Processar pagamento
    let walletTransactionId: string | null = null;

    if (paymentMethod === 'wallet') {
      // Buscar carteira
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError || !wallet) {
        return NextResponse.json({ 
          error: 'Carteira não encontrada. Faça um depósito primeiro.',
          code: 'WALLET_NOT_FOUND'
        }, { status: 400 });
      }

      const balance = parseFloat(wallet.balance) || 0;

      if (balance < totalPrice) {
        return NextResponse.json({ 
          error: 'Saldo insuficiente na carteira',
          code: 'INSUFFICIENT_BALANCE',
          details: { balance, required: totalPrice, missing: totalPrice - balance }
        }, { status: 400 });
      }

      // Descontar
      const newBalance = balance - totalPrice;

      const { error: updateError } = await supabaseAdmin
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      if (updateError) {
        console.error('❌ [API Premium] Erro ao descontar:', updateError);
        return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
      }

      // Criar transação
      const { data: transaction, error: txError } = await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          type: 'premium',
          amount: totalPrice,
          balance_before: balance,
          balance_after: newBalance,
          description: `Assinatura Premium ${plan.display_name}`,
          reference_type: 'premium',
          status: 'completed'
        })
        .select()
        .single();

      if (txError) {
        // Reverter
        await supabaseAdmin.from('wallets').update({ balance }).eq('id', wallet.id);
        return NextResponse.json({ error: 'Erro ao registrar transação' }, { status: 500 });
      }

      walletTransactionId = transaction.id;
      console.log('✅ [API Premium] Pagamento wallet OK');

    } else {
      // TODO: Integrar gateway de pagamento
      console.log('⚠️ [API Premium] Pagamento', paymentMethod, '- SIMULADO');
    }

    // 7. Calcular data de expiração
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + plan.duration_months);

    // 8. Criar ou atualizar assinatura
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('premium_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: plan.id,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        payment_method: paymentMethod,
        amount_paid: totalPrice,
        wallet_transaction_id: walletTransactionId,
        auto_renew: autoRenew,
        cancelled_at: null
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (subError) {
      console.error('❌ [API Premium] Erro ao criar assinatura:', subError);
      // Reverter pagamento se foi via wallet
      if (walletTransactionId) {
        const { data: tx } = await supabaseAdmin
          .from('wallet_transactions')
          .select('wallet_id, balance_before')
          .eq('id', walletTransactionId)
          .single();
        
        if (tx) {
          await supabaseAdmin.from('wallets').update({ balance: tx.balance_before }).eq('id', tx.wallet_id);
          await supabaseAdmin.from('wallet_transactions').update({ status: 'cancelled' }).eq('id', walletTransactionId);
        }
      }
      return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 });
    }

    // 9. Atualizar perfil do usuário (preservando cargo original)
    // Buscar perfil atual para preservar user_type se for cargo especial
    const { data: currentProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    // Cargos especiais que não devem ser alterados
    const specialRoles = ['owner', 'admin', 'moderacao', 'suporte'];
    const currentUserType = currentProfile?.user_type || 'common';
    const shouldPreserveRole = specialRoles.includes(currentUserType);

    // Atualizar perfil: preserva cargo especial, apenas atualiza is_premium
    const updateData: any = {
      is_premium: true,
      premium_expires_at: expiresAt.toISOString()
    };

    // Só atualiza user_type se não for cargo especial
    if (!shouldPreserveRole) {
      updateData.user_type = 'premium';
    } else {
      console.log('🛡️ [API Premium] Preservando cargo especial:', currentUserType);
    }

    await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id);

    console.log('✅ [API Premium] Assinatura criada:', subscription.id);

    // 10. Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Assinatura ativada com sucesso!',
      data: {
        subscriptionId: subscription.id,
        plan: {
          name: plan.name,
          displayName: plan.display_name,
          durationMonths: plan.duration_months
        },
        amountPaid: totalPrice,
        amountPaidFormatted: `R$ ${totalPrice.toFixed(2).replace('.', ',')}`,
        startedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        autoRenew,
        paymentMethod
      }
    });

  } catch (error: any) {
    console.error('❌ [API Premium] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

