import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/premium/status - Ver status da assinatura
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Premium] GET /status - Iniciando...');

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

    const now = new Date();

    // 2. Buscar assinatura ativa
    const { data: subscription } = await supabaseAdmin
      .from('premium_subscriptions')
      .select(`
        *,
        premium_plans:plan_id (
          name,
          display_name,
          price_per_month,
          total_price,
          duration_months
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 3. Se não tem assinatura
    if (!subscription) {
      console.log('✅ [API Premium] Usuário sem assinatura');
      return NextResponse.json({
        success: true,
        data: {
          isPremium: false,
          hasSubscription: false,
          subscription: null
        }
      });
    }

    // 4. Verificar se está ativa
    const isActive = subscription.status === 'active' && new Date(subscription.expires_at) > now;
    const isExpired = new Date(subscription.expires_at) <= now;
    const isCancelled = subscription.status === 'cancelled';

    // Calcular dias restantes
    const expiresAt = new Date(subscription.expires_at);
    const diffTime = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Se expirou mas ainda está marcado como active, atualizar
    if (isExpired && subscription.status === 'active') {
      await supabaseAdmin
        .from('premium_subscriptions')
        .update({ status: 'expired' })
        .eq('id', subscription.id);

      // Preservar cargo especial ao expirar premium
      const { data: currentProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      const specialRoles = ['owner', 'admin', 'moderacao', 'suporte'];
      const currentUserType = currentProfile?.user_type || 'common';
      const shouldPreserveRole = specialRoles.includes(currentUserType);

      const updateData: any = {
        is_premium: false,
        premium_expires_at: null
      };

      // Só atualiza user_type se não for cargo especial
      if (!shouldPreserveRole) {
        updateData.user_type = 'common';
      } else {
        console.log('🛡️ [API Premium] Preservando cargo especial ao expirar:', currentUserType);
      }

      await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id);
    }

    console.log('✅ [API Premium] Status:', isActive ? 'Ativo' : 'Inativo', '| Dias:', daysRemaining);

    return NextResponse.json({
      success: true,
      data: {
        isPremium: isActive,
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          status: isExpired ? 'expired' : subscription.status,
          plan: subscription.premium_plans ? {
            name: subscription.premium_plans.name,
            displayName: subscription.premium_plans.display_name,
            pricePerMonth: parseFloat(subscription.premium_plans.price_per_month),
            totalPrice: parseFloat(subscription.premium_plans.total_price),
            durationMonths: subscription.premium_plans.duration_months
          } : null,
          startedAt: subscription.started_at,
          expiresAt: subscription.expires_at,
          cancelledAt: subscription.cancelled_at,
          daysRemaining,
          autoRenew: subscription.auto_renew,
          paymentMethod: subscription.payment_method,
          amountPaid: parseFloat(subscription.amount_paid),
          isExpired,
          isCancelled,
          isActive
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Premium] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

