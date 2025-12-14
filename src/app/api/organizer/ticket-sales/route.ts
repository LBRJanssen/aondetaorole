import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLATFORM_COMMISSION_PERCENT = 10;

// GET /api/organizer/ticket-sales - Obter dados de vendas de ingressos do organizador
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Organizer] GET /ticket-sales - Iniciando...');

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

    // 2. Pegar parâmetros de data
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Definir período padrão (mês atual se não especificado)
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // 3. Buscar eventos do organizador
    const { data: organizerEvents, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, name')
      .eq('organizer_id', user.id);

    if (eventsError) {
      console.error('❌ [API Organizer] Erro ao buscar eventos:', eventsError);
      return NextResponse.json({ error: 'Erro ao buscar eventos' }, { status: 500 });
    }

    const eventIds = organizerEvents?.map(e => e.id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalSales: 0,
          totalTickets: 0,
          averageTicket: 0,
          platformCommission: 0,
          transferredToOrganizer: 0,
          withBoost: {
            sales: 0,
            tickets: 0,
            averageTicket: 0
          },
          withoutBoost: {
            sales: 0,
            tickets: 0,
            averageTicket: 0
          },
          eventsWithSales: 0
        }
      });
    }

    // 4. Buscar transações de compra de ingressos dos eventos do organizador
    const { data: ticketTransactions, error: transactionsError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, amount, created_at, reference_id, description')
      .eq('type', 'purchase')
      .eq('reference_type', 'event')
      .in('reference_id', eventIds)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('❌ [API Organizer] Erro ao buscar transações:', transactionsError);
      return NextResponse.json({ error: 'Erro ao buscar transações' }, { status: 500 });
    }

    // 5. Buscar eventos com boost ativo no período
    const { data: activeBoosts, error: boostsError } = await supabaseAdmin
      .from('event_boosts')
      .select('event_id, started_at, expires_at')
      .in('event_id', eventIds)
      .eq('is_active', true)
      .or(`started_at.lte.${endDate.toISOString()},expires_at.gte.${startDate.toISOString()}`);

    if (boostsError) {
      console.error('❌ [API Organizer] Erro ao buscar boosts:', boostsError);
      // Continuar mesmo com erro nos boosts
    }

    // Mapear eventos com boost ativo
    const eventsWithBoost = new Set(
      activeBoosts?.map(b => b.event_id) || []
    );

    // 6. Separar transações por evento e calcular estatísticas
    const transactionsByEvent = new Map<string, Array<{ amount: number; createdAt: string }>>();
    const eventsWithSalesSet = new Set<string>();

    ticketTransactions?.forEach(tx => {
      const eventId = tx.reference_id;
      if (!transactionsByEvent.has(eventId)) {
        transactionsByEvent.set(eventId, []);
      }
      transactionsByEvent.get(eventId)?.push({
        amount: Math.abs(parseFloat(tx.amount)),
        createdAt: tx.created_at
      });
      eventsWithSalesSet.add(eventId);
    });

    // 7. Calcular totais
    const totalSales = ticketTransactions?.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0) || 0;
    const totalTickets = ticketTransactions?.length || 0;
    const averageTicket = totalTickets > 0 ? totalSales / totalTickets : 0;
    const platformCommission = totalSales * (PLATFORM_COMMISSION_PERCENT / 100);
    const transferredToOrganizer = totalSales - platformCommission;

    // 8. Separar por eventos com boost vs sem boost
    let withBoostSales = 0;
    let withBoostTickets = 0;
    let withoutBoostSales = 0;
    let withoutBoostTickets = 0;

    transactionsByEvent.forEach((transactions, eventId) => {
      const eventSales = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const eventTickets = transactions.length;
      const hasBoost = eventsWithBoost.has(eventId);

      if (hasBoost) {
        withBoostSales += eventSales;
        withBoostTickets += eventTickets;
      } else {
        withoutBoostSales += eventSales;
        withoutBoostTickets += eventTickets;
      }
    });

    const withBoostAverage = withBoostTickets > 0 ? withBoostSales / withBoostTickets : 0;
    const withoutBoostAverage = withoutBoostTickets > 0 ? withoutBoostSales / withoutBoostTickets : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalTickets,
        averageTicket,
        platformCommission,
        transferredToOrganizer,
        withBoost: {
          sales: withBoostSales,
          tickets: withBoostTickets,
          averageTicket: withBoostAverage
        },
        withoutBoost: {
          sales: withoutBoostSales,
          tickets: withoutBoostTickets,
          averageTicket: withoutBoostAverage
        },
        eventsWithSales: eventsWithSalesSet.size,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Organizer] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar dados de vendas',
      details: error.message 
    }, { status: 500 });
  }
}


