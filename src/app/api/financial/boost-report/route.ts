import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper para verificar se usuário tem acesso financeiro
async function hasFinancialAccess(userId: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_type')
    .eq('id', userId)
    .single();

  if (!profile) return false;
  return profile.user_type === 'owner' || profile.user_type === 'financeiro';
}

// GET /api/financial/boost-report - Relatório de boosts
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] GET /boost-report - Iniciando...');

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

    // 2. Verificar permissão financeira
    const hasAccess = await hasFinancialAccess(user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado. Apenas Owner e Financeiro podem acessar.' }, { status: 403 });
    }

    // 3. Pegar parâmetros
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    if (startParam && endParam) {
      startDate = new Date(startParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Padrão: mês atual
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // 4. Buscar transações de boost
    const { data: boostTransactions, error: boostError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('type', 'boost')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (boostError) {
      console.error('❌ [API Financial] Erro ao buscar boosts:', boostError);
      return NextResponse.json({ error: 'Erro ao buscar transações de boost' }, { status: 500 });
    }

    // 5. Buscar event_boosts relacionados
    const boostIds = [...new Set(boostTransactions?.map(t => t.reference_id).filter(Boolean) || [])];
    const { data: eventBoosts } = await supabaseAdmin
      .from('event_boosts')
      .select('id, event_id, boost_type, price, started_at, expires_at, is_active, user_id')
      .in('id', boostIds.length > 0 ? boostIds : ['00000000-0000-0000-0000-000000000000']);

    const boostMap = new Map((eventBoosts || []).map(b => [b.id, b]));

    // 6. Buscar eventos relacionados
    const eventIds = [...new Set(eventBoosts?.map(b => b.event_id).filter(Boolean) || [])];
    const { data: events } = await supabaseAdmin
      .from('events')
      .select('id, name, organizer_id, organizer_name')
      .in('id', eventIds.length > 0 ? eventIds : ['00000000-0000-0000-0000-000000000000']);

    const eventMap = new Map((events || []).map(e => [e.id, e]));

    // 7. Calcular estatísticas gerais
    const totalBoostRevenue = boostTransactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const totalBoosts = boostTransactions?.length || 0;
    const averageBoostPrice = totalBoosts > 0 ? totalBoostRevenue / totalBoosts : 0;

    // 8. Agrupar por tipo de boost
    const boostsByType = {
      '12h': { count: 0, revenue: 0 },
      '24h': { count: 0, revenue: 0 }
    };

    boostTransactions?.forEach(transaction => {
      const boost = boostMap.get(transaction.reference_id);
      if (boost) {
        const boostType = boost.boost_type as '12h' | '24h';
        if (boostsByType[boostType]) {
          boostsByType[boostType].count++;
          boostsByType[boostType].revenue += parseFloat(transaction.amount);
        }
      }
    });

    // 9. Agrupar por evento
    const boostsByEvent = new Map<string, {
      eventId: string;
      eventName: string;
      organizerName: string;
      boostCount: number;
      totalRevenue: number;
      boosts: Array<{
        id: string;
        type: string;
        price: number;
        startedAt: string;
        expiresAt: string;
        isActive: boolean;
      }>;
    }>();

    boostTransactions?.forEach(transaction => {
      const boost = boostMap.get(transaction.reference_id);
      if (!boost) return;

      const event = eventMap.get(boost.event_id);
      if (!event) return;

      const eventKey = event.id;
      if (!boostsByEvent.has(eventKey)) {
        boostsByEvent.set(eventKey, {
          eventId: event.id,
          eventName: event.name || 'Evento',
          organizerName: event.organizer_name || 'Organizador',
          boostCount: 0,
          totalRevenue: 0,
          boosts: []
        });
      }

      const eventData = boostsByEvent.get(eventKey)!;
      eventData.boostCount++;
      eventData.totalRevenue += parseFloat(transaction.amount);
      eventData.boosts.push({
        id: boost.id,
        type: boost.boost_type,
        price: parseFloat(boost.price),
        startedAt: boost.started_at,
        expiresAt: boost.expires_at,
        isActive: boost.is_active
      });
    });

    // Ordenar eventos por total de receita
    const eventsArray = Array.from(boostsByEvent.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topEvents = eventsArray.slice(0, 10);

    // 10. Boosts ativos no momento
    const { data: activeBoosts } = await supabaseAdmin
      .from('event_boosts')
      .select('id')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    const activeBoostsCount = activeBoosts?.length || 0;

    // 11. Vendas por dia
    const salesByDay = new Map<string, { revenue: number; count: number }>();
    boostTransactions?.forEach(transaction => {
      const day = new Date(transaction.created_at).toISOString().split('T')[0];
      const current = salesByDay.get(day) || { revenue: 0, count: 0 };
      salesByDay.set(day, {
        revenue: current.revenue + parseFloat(transaction.amount),
        count: current.count + 1
      });
    });

    const dailySales = Array.from(salesByDay.entries())
      .map(([date, data]) => ({ date, revenue: data.revenue, count: data.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 12. Top compradores de boosts
    const boostsByUser = new Map<string, { userId: string; count: number; totalSpent: number }>();
    
    boostTransactions?.forEach(transaction => {
      const userId = transaction.user_id;
      if (!boostsByUser.has(userId)) {
        boostsByUser.set(userId, {
          userId,
          count: 0,
          totalSpent: 0
        });
      }
      const userData = boostsByUser.get(userId)!;
      userData.count++;
      userData.totalSpent += parseFloat(transaction.amount);
    });

    const topBuyers = Array.from(boostsByUser.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Buscar nomes dos top compradores
    const topBuyerIds = topBuyers.map(b => b.userId);
    const { data: buyerProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, email')
      .in('id', topBuyerIds.length > 0 ? topBuyerIds : ['00000000-0000-0000-0000-000000000000']);

    const buyerMap = new Map((buyerProfiles || []).map(p => [p.id, p]));
    const topBuyersWithNames = topBuyers.map(buyer => ({
      ...buyer,
      name: buyerMap.get(buyer.userId)?.name || 'Usuário',
      email: buyerMap.get(buyer.userId)?.email || ''
    }));

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalBoostRevenue,
          totalBoosts,
          averageBoostPrice,
          activeBoostsCount
        },
        byType: boostsByType,
        byEvent: eventsArray,
        topEvents,
        dailySales,
        topBuyers: topBuyersWithNames,
        totalEvents: eventsArray.length
      }
    });

  } catch (error: any) {
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar relatório de boosts',
      details: error.message 
    }, { status: 500 });
  }
}




