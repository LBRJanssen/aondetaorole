import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/boost/expire - Expirar boosts antigos (job/cron)
// Pode ser chamado por um cron job ou Vercel Cron
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Boost] POST /expire - Iniciando limpeza...');

    // Opcional: verificar secret para cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Se tiver CRON_SECRET configurado, exigir autenticação
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Também aceitar token de admin
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        
        if (!user) {
          return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Verificar se é admin/owner
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (!profile || !['owner', 'admin'].includes(profile.user_type)) {
          return NextResponse.json({ error: 'Apenas admins podem executar' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    const now = new Date().toISOString();

    // 1. Buscar boosts expirados
    const { data: expiredBoosts, error: fetchError } = await supabaseAdmin
      .from('event_boosts')
      .select('id, event_id')
      .eq('is_active', true)
      .lt('expires_at', now);

    if (fetchError) {
      console.error('❌ [API Boost] Erro ao buscar expirados:', fetchError);
      return NextResponse.json({ error: 'Erro ao buscar boosts' }, { status: 500 });
    }

    if (!expiredBoosts || expiredBoosts.length === 0) {
      console.log('✅ [API Boost] Nenhum boost para expirar');
      return NextResponse.json({
        success: true,
        message: 'Nenhum boost para expirar',
        data: { expiredCount: 0 }
      });
    }

    // 2. Marcar como inativos
    const { error: updateError } = await supabaseAdmin
      .from('event_boosts')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('expires_at', now);

    if (updateError) {
      console.error('❌ [API Boost] Erro ao expirar boosts:', updateError);
      return NextResponse.json({ error: 'Erro ao expirar boosts' }, { status: 500 });
    }

    // 3. Atualizar contador de boosts nos eventos afetados
    const affectedEventIds = [...new Set(expiredBoosts.map(b => b.event_id))];

    for (const eventId of affectedEventIds) {
      const { count } = await supabaseAdmin
        .from('event_boosts')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('is_active', true)
        .gt('expires_at', now);

      await supabaseAdmin
        .from('events')
        .update({ boosts: count || 0 })
        .eq('id', eventId);
    }

    console.log('✅ [API Boost] Expirados:', expiredBoosts.length, '| Eventos afetados:', affectedEventIds.length);

    return NextResponse.json({
      success: true,
      message: `${expiredBoosts.length} boost(s) expirado(s)`,
      data: {
        expiredCount: expiredBoosts.length,
        affectedEvents: affectedEventIds.length
      }
    });

  } catch (error: any) {
    console.error('❌ [API Boost] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// GET também funciona para facilitar testes
export async function GET(request: NextRequest) {
  return POST(request);
}

