import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/premium/discount - Verificar desconto premium do usuário
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Premium] GET /discount - Iniciando...');

    // 1. Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: true,
        data: { 
          hasPremium: false, 
          discountPercent: 0,
          planName: null
        } 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: true,
        data: { 
          hasPremium: false, 
          discountPercent: 0,
          planName: null
        } 
      });
    }

    // 2. Buscar perfil do usuário para verificar is_premium
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_premium, premium_expires_at')
      .eq('id', user.id)
      .single();

    // 3. Buscar assinatura ativa em premium_subscriptions
    const { data: subscription } = await supabaseAdmin
      .from('premium_subscriptions')
      .select(`
        *,
        premium_plans:plan_id (
          name,
          display_name,
          boost_discount_percent
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    // 4. Se tem subscription ativa, usar ela
    if (subscription && subscription.premium_plans) {
      const plan = subscription.premium_plans as any;
      const discountPercent = plan.boost_discount_percent || 0;

      console.log('✅ [API Premium] Usuário tem premium via subscription:', plan.name, '| Desconto:', discountPercent + '%');

      return NextResponse.json({
        success: true,
        data: {
          hasPremium: true,
          discountPercent,
          planName: plan.name,
          planDisplayName: plan.display_name,
          subscriptionId: subscription.id,
          expiresAt: subscription.expires_at
        }
      });
    }

    // 5. Se não tem subscription mas tem is_premium no user_profiles, buscar o plano mais recente
    if (userProfile?.is_premium && userProfile.premium_expires_at && new Date(userProfile.premium_expires_at) > new Date()) {
      // Buscar a subscription mais recente (mesmo que inativa) para pegar o plano
      const { data: lastSubscription } = await supabaseAdmin
        .from('premium_subscriptions')
        .select(`
          *,
          premium_plans:plan_id (
            name,
            display_name,
            boost_discount_percent
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Se encontrou uma subscription (mesmo que inativa), usar o plano dela
      if (lastSubscription && lastSubscription.premium_plans) {
        const plan = lastSubscription.premium_plans as any;
        const discountPercent = plan.boost_discount_percent || 0;

        console.log('✅ [API Premium] Usuário tem premium via user_profiles (plano da última subscription):', plan.name, '| Desconto:', discountPercent + '%');

        return NextResponse.json({
          success: true,
          data: {
            hasPremium: true,
            discountPercent,
            planName: plan.name,
            planDisplayName: plan.display_name,
            expiresAt: userProfile.premium_expires_at
          }
        });
      }

      // Se não encontrou subscription, tentar determinar o plano pelo user_type ou usar o plano mais comum (max = 20%)
      // Como fallback, vamos usar o desconto do plano Max (20%) se o usuário tem premium ativo
      console.log('⚠️ [API Premium] Usuário tem is_premium mas não encontrou subscription. Usando desconto padrão do Max (20%)');
      
      return NextResponse.json({
        success: true,
        data: {
          hasPremium: true,
          discountPercent: 20, // Desconto padrão do Max
          planName: 'max',
          planDisplayName: 'Premium Max',
          expiresAt: userProfile.premium_expires_at
        }
      });
    }

    console.log('✅ [API Premium] Usuário não tem premium ativo');
    return NextResponse.json({
      success: true,
      data: {
        hasPremium: false,
        discountPercent: 0,
        planName: null,
        planDisplayName: null
      }
    });

  } catch (error: any) {
    console.error('❌ [API Premium] Erro:', error);
    return NextResponse.json({
      success: true,
      data: {
        hasPremium: false,
        discountPercent: 0,
        planName: null
      }
    });
  }
}

