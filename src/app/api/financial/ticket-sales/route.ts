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

// GET /api/financial/ticket-sales - Relatório de vendas de ingressos
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] GET /ticket-sales - Iniciando...');

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
    const eventId = searchParams.get('eventId');
    
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

    // 4. Buscar vendas de ingressos
    let ticketQuery = supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('type', 'purchase')
      .eq('status', 'completed')
      .eq('reference_type', 'ticket')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (eventId) {
      ticketQuery = ticketQuery.eq('reference_id', eventId);
    }

    const { data: ticketPurchases, error: purchasesError } = await ticketQuery.order('created_at', { ascending: false });

    if (purchasesError) {
      console.error('❌ [API Financial] Erro ao buscar vendas:', purchasesError);
      return NextResponse.json({ error: 'Erro ao buscar vendas de ingressos' }, { status: 500 });
    }

    // 5. Calcular estatísticas gerais
    const totalSales = ticketPurchases?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const totalTickets = ticketPurchases?.length || 0;
    const averageTicket = totalTickets > 0 ? totalSales / totalTickets : 0;

    // 6. Buscar eventos relacionados
    const eventIds = [...new Set(ticketPurchases?.map(t => t.reference_id).filter(Boolean) || [])];
    const { data: events } = await supabaseAdmin
      .from('events')
      .select('id, name, organizer_id, organizer_name')
      .in('id', eventIds);

    const eventMap = new Map((events || []).map(e => [e.id, e]));

    // 7. Agrupar por evento
    const salesByEvent = new Map<string, {
      eventId: string;
      eventName: string;
      organizerId: string;
      organizerName: string;
      totalSales: number;
      ticketCount: number;
      averageTicket: number;
      sales: Array<{
        id: string;
        amount: number;
        date: string;
        userId: string;
      }>;
    }>();

    ticketPurchases?.forEach(purchase => {
      if (!purchase.reference_id) return;
      
      const event = eventMap.get(purchase.reference_id);
      if (!event) return;

      const eventKey = event.id;
      if (!salesByEvent.has(eventKey)) {
        salesByEvent.set(eventKey, {
          eventId: event.id,
          eventName: event.name || 'Evento',
          organizerId: event.organizer_id,
          organizerName: event.organizer_name || 'Organizador',
          totalSales: 0,
          ticketCount: 0,
          averageTicket: 0,
          sales: []
        });
      }

      const eventData = salesByEvent.get(eventKey)!;
      eventData.totalSales += parseFloat(purchase.amount);
      eventData.ticketCount++;
      eventData.sales.push({
        id: purchase.id,
        amount: parseFloat(purchase.amount),
        date: purchase.created_at,
        userId: purchase.user_id
      });
    });

    // Calcular ticket médio por evento
    salesByEvent.forEach(eventData => {
      eventData.averageTicket = eventData.ticketCount > 0 ? eventData.totalSales / eventData.ticketCount : 0;
    });

    // Converter para array e ordenar por total de vendas
    const eventsArray = Array.from(salesByEvent.values()).sort((a, b) => b.totalSales - a.totalSales);

    // 8. Top eventos (top 10)
    const topEvents = eventsArray.slice(0, 10);

    // 9. Calcular comissão da plataforma (10%)
    const PLATFORM_COMMISSION_PERCENT = 10;
    const platformCommission = totalSales * (PLATFORM_COMMISSION_PERCENT / 100);
    const organizerAmount = totalSales - platformCommission;

    // 10. Vendas por dia (para gráfico)
    const salesByDay = new Map<string, number>();
    ticketPurchases?.forEach(purchase => {
      const day = new Date(purchase.created_at).toISOString().split('T')[0];
      const current = salesByDay.get(day) || 0;
      salesByDay.set(day, current + parseFloat(purchase.amount));
    });

    const dailySales = Array.from(salesByDay.entries())
      .map(([date, amount]) => ({ date, amount, count: ticketPurchases?.filter(t => t.created_at.startsWith(date)).length || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 11. Eventos com boost vs sem boost
    const { data: eventsWithBoosts } = await supabaseAdmin
      .from('events')
      .select('id, name')
      .gt('boosts', 0)
      .in('id', eventsArray.map(e => e.eventId));

    const eventIdsWithBoost = new Set(eventsWithBoosts?.map(e => e.id) || []);

    let salesWithBoost = 0;
    let salesWithoutBoost = 0;
    let ticketsWithBoost = 0;
    let ticketsWithoutBoost = 0;

    eventsArray.forEach(event => {
      if (eventIdsWithBoost.has(event.eventId)) {
        salesWithBoost += event.totalSales;
        ticketsWithBoost += event.ticketCount;
      } else {
        salesWithoutBoost += event.totalSales;
        ticketsWithoutBoost += event.ticketCount;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalSales,
          totalTickets,
          averageTicket,
          platformCommission,
          organizerAmount,
          commissionPercent: PLATFORM_COMMISSION_PERCENT
        },
        byEvent: eventsArray,
        topEvents,
        dailySales,
        boostComparison: {
          withBoost: {
            sales: salesWithBoost,
            tickets: ticketsWithBoost,
            averageTicket: ticketsWithBoost > 0 ? salesWithBoost / ticketsWithBoost : 0
          },
          withoutBoost: {
            sales: salesWithoutBoost,
            tickets: ticketsWithoutBoost,
            averageTicket: ticketsWithoutBoost > 0 ? salesWithoutBoost / ticketsWithoutBoost : 0
          }
        },
        totalEvents: eventsArray.length
      }
    });

  } catch (error: any) {
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar relatório de vendas',
      details: error.message 
    }, { status: 500 });
  }
}

