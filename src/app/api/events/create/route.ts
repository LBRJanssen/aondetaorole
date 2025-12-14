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

// POST /api/events/create - Criar evento com verificação de limite
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Events] POST /create - Iniciando...');

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

    console.log('🔐 [API Events] Usuário:', user.id);

    // 2. Buscar perfil do usuário
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type, is_premium, name')
      .eq('id', user.id)
      .single();

    const userType = profile?.user_type || 'common';
    const isPremium = profile?.is_premium || false;
    const userName = profile?.name || 'Usuário';

    // 3. Verificar limite de eventos - considerar plano premium
    let effectiveType = userType;
    
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
        const planName = (subscription.premium_plans as any).name;
        if (planName === 'monthly') effectiveType = 'premium_monthly';
        else if (planName === 'quarterly') effectiveType = 'premium_quarterly';
        else if (planName === 'yearly') effectiveType = 'premium_yearly';
      }
    }
    
    const { data: limitConfig } = await supabaseAdmin
      .from('event_limits_config')
      .select('max_events_per_day')
      .eq('user_type', effectiveType)
      .single();

    const maxEvents = limitConfig?.max_events_per_day || DEFAULT_LIMITS[effectiveType] || 3;

    // Contar eventos criados hoje
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

    if (eventsTodayCount >= maxEvents) {
      console.log('❌ [API Events] Limite atingido:', eventsTodayCount, '>=', maxEvents);
      return NextResponse.json({
        error: 'Você atingiu o limite de eventos por dia',
        code: 'EVENT_LIMIT_REACHED',
        details: {
          eventsToday: eventsTodayCount,
          maxEvents,
          userType,
          isPremium,
          suggestion: !isPremium 
            ? 'Faça upgrade para Premium para criar eventos ilimitados!' 
            : null
        }
      }, { status: 429 }); // 429 = Too Many Requests
    }

    // 4. Pegar dados do evento
    const body = await request.json();
    const {
      name,
      description,
      address,
      coordinates,
      maxCapacity,
      ageRange,
      eventType,
      coverImage,
      isFree,
      price,
      ticketCategories,
      startDate,
      endDate
    } = body;

    // 5. Validações básicas
    if (!name || name.trim().length < 3) {
      return NextResponse.json({ error: 'Nome do evento deve ter pelo menos 3 caracteres' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ error: 'Endereço é obrigatório' }, { status: 400 });
    }

    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      return NextResponse.json({ error: 'Coordenadas são obrigatórias' }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json({ error: 'Data de início é obrigatória' }, { status: 400 });
    }

    // 6. Criar evento
    const eventData = {
      name: name.trim(),
      description: description?.trim() || null,
      address,
      coordinates,
      max_capacity: maxCapacity || 100,
      current_attendees: 0,
      age_range: ageRange || { min: 18 },
      event_type: eventType || 'other',
      cover_image: coverImage || '',
      is_free: isFree ?? true,
      price: isFree ? null : (price || null),
      ticket_categories: ticketCategories || null,
      boosts: 0,
      organizer_id: user.id,
      organizer_name: userName,
      is_premium_organizer: isPremium,
      start_date: startDate,
      end_date: endDate || null,
      is_active: true,
      is_approved: true, // Aprovação automática por enquanto
      views: 0,
      interested_count: 0,
      going_count: 0,
      on_the_way_count: 0
    };

    console.log('📤 [API Events] Criando evento:', eventData.name);

    const { data: event, error: createError } = await supabaseAdmin
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (createError) {
      console.error('❌ [API Events] Erro ao criar:', createError);
      return NextResponse.json({ error: 'Erro ao criar evento' }, { status: 500 });
    }

    console.log('✅ [API Events] Evento criado:', event.id);

    // 7. Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Evento criado com sucesso!',
      data: {
        event: {
          id: event.id,
          name: event.name,
          address: event.address,
          startDate: event.start_date
        },
        limits: {
          eventsToday: eventsTodayCount + 1,
          maxEvents,
          remaining: Math.max(0, maxEvents - eventsTodayCount - 1)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Events] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

