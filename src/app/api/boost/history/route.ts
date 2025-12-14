import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/boost/history - Histórico de boosts do usuário
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Boost] GET /history - Iniciando...');

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

    // 2. Parâmetros
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const eventId = searchParams.get('eventId'); // Filtro opcional
    const status = searchParams.get('status'); // 'active' ou 'expired'

    const offset = (page - 1) * limit;
    const now = new Date().toISOString();

    // 3. Construir query
    let query = supabaseAdmin
      .from('event_boosts')
      .select(`
        *,
        events:event_id (
          id,
          name,
          cover_image
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (status === 'active') {
      query = query.eq('is_active', true).gt('expires_at', now);
    } else if (status === 'expired') {
      query = query.or(`is_active.eq.false,expires_at.lt.${now}`);
    }

    // 4. Executar
    const { data: boosts, error, count } = await query;

    if (error) {
      console.error('❌ [API Boost] Erro ao buscar histórico:', error);
      return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 });
    }

    // 5. Calcular totais
    const { data: stats } = await supabaseAdmin
      .from('event_boosts')
      .select('price')
      .eq('user_id', user.id);

    const totalSpent = stats?.reduce((sum, b) => sum + parseFloat(b.price), 0) || 0;
    const totalBoosts = stats?.length || 0;

    // 6. Formatar resposta
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    console.log('✅ [API Boost] Histórico:', boosts?.length, 'boosts');

    return NextResponse.json({
      success: true,
      data: {
        boosts: boosts?.map(b => ({
          id: b.id,
          type: b.boost_type,
          price: parseFloat(b.price),
          durationHours: b.duration_hours,
          startedAt: b.started_at,
          expiresAt: b.expires_at,
          isActive: b.is_active && new Date(b.expires_at) > new Date(),
          isExpired: !b.is_active || new Date(b.expires_at) <= new Date(),
          paymentMethod: b.payment_method,
          event: b.events ? {
            id: b.events.id,
            name: b.events.name,
            coverImage: b.events.cover_image
          } : null
        })) || [],
        stats: {
          totalBoosts,
          totalSpent,
          totalSpentFormatted: `R$ ${totalSpent.toFixed(2).replace('.', ',')}`
        },
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Boost] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

