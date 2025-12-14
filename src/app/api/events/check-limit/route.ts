import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Limites padrão por tipo de usuário
const DEFAULT_LIMITS: Record<string, number> = {
  common: 3,
  premium_monthly: 20,
  premium_quarterly: 50,
  premium_yearly: 100,
  owner: 999,
  admin: 50,
  moderacao: 20,
  suporte: 10
};

// GET /api/events/check-limit - Verificar se pode criar evento
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Events] GET /check-limit - Iniciando...');

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

    // 2. Buscar perfil do usuário
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type, is_premium')
      .eq('id', user.id)
      .single();

    const userType = profile?.user_type || 'common';
    const isPremium = profile?.is_premium || false;

    // 3. Se for premium, buscar o plano para determinar o limite
    let effectiveType = userType;
    let planName = null;

    if (isPremium || userType === 'premium') {
      const { data: subscription } = await supabaseAdmin
        .from('premium_subscriptions')
        .select(`
          plan_id,
          premium_plans:plan_id (name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscription?.premium_plans) {
        planName = (subscription.premium_plans as any).name;
        // Mapear plano para tipo de limite
        if (planName === 'monthly') effectiveType = 'premium_monthly';
        else if (planName === 'quarterly') effectiveType = 'premium_quarterly';
        else if (planName === 'yearly') effectiveType = 'premium_yearly';
      }
    }

    // 4. Buscar limite configurado
    const { data: limitConfig } = await supabaseAdmin
      .from('event_limits_config')
      .select('max_events_per_day')
      .eq('user_type', effectiveType)
      .single();

    const maxEvents = limitConfig?.max_events_per_day || DEFAULT_LIMITS[effectiveType] || 3;

    // 4. Contar eventos criados hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: eventsToday } = await supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', user.id)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    const eventsTodayCount = eventsToday || 0;
    const remaining = Math.max(0, maxEvents - eventsTodayCount);
    const canCreate = eventsTodayCount < maxEvents;

    console.log('✅ [API Events] Limite:', eventsTodayCount, '/', maxEvents, '| Pode criar:', canCreate);

    return NextResponse.json({
      success: true,
      data: {
        canCreate,
        eventsToday: eventsTodayCount,
        maxEvents,
        remaining,
        isUnlimited: maxEvents >= 999,
        userType,
        isPremium,
        message: canCreate 
          ? (maxEvents >= 999 
              ? 'Você pode criar eventos ilimitados!' 
              : `Você pode criar mais ${remaining} evento(s) hoje`)
          : 'Você atingiu o limite de eventos por dia. Faça upgrade para Premium para criar ilimitados!'
      }
    });

  } catch (error: any) {
    console.error('❌ [API Events] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

