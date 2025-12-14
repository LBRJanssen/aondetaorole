import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/boost/status?eventId=xxx - Ver boosts de um evento
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Boost] GET /status - Iniciando...');

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId é obrigatório' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 1. Primeiro, expirar boosts antigos deste evento
    await supabaseAdmin
      .from('event_boosts')
      .update({ is_active: false })
      .eq('event_id', eventId)
      .eq('is_active', true)
      .lt('expires_at', now);

    // 2. Buscar boosts ativos
    const { data: activeBoosts, error: boostsError } = await supabaseAdmin
      .from('event_boosts')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('expires_at', { ascending: true });

    if (boostsError) {
      console.error('❌ [API Boost] Erro ao buscar boosts:', boostsError);
      return NextResponse.json({ error: 'Erro ao buscar boosts' }, { status: 500 });
    }

    // 3. Calcular estatísticas
    const totalActive = activeBoosts?.length || 0;
    
    // Próximo boost a expirar
    const nextExpiration = activeBoosts?.[0]?.expires_at || null;
    
    // Boost que vai expirar por último
    const lastExpiration = activeBoosts?.[activeBoosts.length - 1]?.expires_at || null;

    // Contar por tipo
    const boostsByType = {
      '12h': activeBoosts?.filter(b => b.boost_type === '12h').length || 0,
      '24h': activeBoosts?.filter(b => b.boost_type === '24h').length || 0
    };

    // 4. Buscar histórico total do evento
    const { count: totalEver } = await supabaseAdmin
      .from('event_boosts')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    console.log('✅ [API Boost] Status:', totalActive, 'ativos de', totalEver, 'total');

    return NextResponse.json({
      success: true,
      data: {
        eventId,
        activeBoosts: totalActive,
        totalBoostsEver: totalEver || 0,
        boostsByType,
        nextExpiration,
        lastExpiration,
        boosts: activeBoosts?.map(b => ({
          id: b.id,
          type: b.boost_type,
          price: parseFloat(b.price),
          startedAt: b.started_at,
          expiresAt: b.expires_at,
          durationHours: b.duration_hours,
          paymentMethod: b.payment_method
        })) || []
      }
    });

  } catch (error: any) {
    console.error('❌ [API Boost] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

