import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Taxa de comissão do organizador (exemplo: 10% do valor do ingresso)
const ORGANIZER_COMMISSION_PERCENT = 10;

// GET /api/boost/profit - Calcular lucro por boost
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Boost] GET /profit - Iniciando...');

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

    console.log('🔐 [API Boost] Usuário:', user.id);

    // 2. Buscar todos os boosts do usuário (como comprador)
    const { data: userBoosts, error: boostsError } = await supabaseAdmin
      .from('event_boosts')
      .select(`
        *,
        events:event_id (
          id,
          name,
          organizer_id,
          cover_image
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (boostsError) {
      console.error('❌ [API Boost] Erro ao buscar boosts:', boostsError);
      return NextResponse.json({ error: 'Erro ao buscar boosts' }, { status: 500 });
    }

    // 3. Buscar eventos do usuário como organizador
    const { data: userEvents, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, name, organizer_id')
      .eq('organizer_id', user.id);

    if (eventsError) {
      console.error('❌ [API Boost] Erro ao buscar eventos:', eventsError);
      return NextResponse.json({ error: 'Erro ao buscar eventos' }, { status: 500 });
    }

    const userEventIds = userEvents?.map(e => e.id) || [];

    // 4. Para cada evento do usuário, buscar boosts ativos e calcular lucro
    const profitData = await Promise.all(
      userEventIds.map(async (eventId) => {
        // Buscar boosts ativos do evento
        const { data: eventBoosts } = await supabaseAdmin
          .from('event_boosts')
          .select('*')
          .eq('event_id', eventId)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('started_at', { ascending: false });

        if (!eventBoosts || eventBoosts.length === 0) {
          return null;
        }

        // Buscar vendas de ingressos durante o período dos boosts
        const boostPeriods = eventBoosts.map(boost => ({
          start: boost.started_at,
          end: boost.expires_at,
          boostId: boost.id
        }));

        // Buscar todas as transações de compra de ingressos deste evento
        const { data: ticketPurchases } = await supabaseAdmin
          .from('wallet_transactions')
          .select('*')
          .eq('reference_id', eventId)
          .eq('reference_type', 'event')
          .eq('type', 'purchase')
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        // Calcular lucro por boost
        let totalProfit = 0;
        let totalTicketSales = 0;
        const boostProfits = eventBoosts.map(boost => {
          // Vendas durante o período deste boost
          const boostPurchases = ticketPurchases?.filter(purchase => {
            const purchaseDate = new Date(purchase.created_at);
            const boostStart = new Date(boost.started_at);
            const boostEnd = new Date(boost.expires_at);
            return purchaseDate >= boostStart && purchaseDate <= boostEnd;
          }) || [];

          // Calcular lucro (10% de comissão sobre vendas)
          const boostProfit = boostPurchases.reduce((sum, purchase) => {
            const commission = parseFloat(purchase.amount) * (ORGANIZER_COMMISSION_PERCENT / 100);
            return sum + commission;
          }, 0);

          const boostSales = boostPurchases.reduce((sum, purchase) => {
            return sum + parseFloat(purchase.amount);
          }, 0);

          totalProfit += boostProfit;
          totalTicketSales += boostSales;

          return {
            boostId: boost.id,
            boostType: boost.boost_type,
            startedAt: boost.started_at,
            expiresAt: boost.expires_at,
            price: parseFloat(boost.price),
            ticketSales: boostSales,
            profit: boostProfit,
            ticketCount: boostPurchases.length
          };
        });

        const event = userEvents?.find(e => e.id === eventId);

        return {
          eventId,
          eventName: event?.name || 'Evento',
          boosts: boostProfits,
          totalBoosts: eventBoosts.length,
          totalProfit,
          totalTicketSales,
          totalTicketCount: ticketPurchases?.length || 0,
          totalBoostCost: eventBoosts.reduce((sum, b) => sum + parseFloat(b.price), 0),
          roi: totalProfit > 0 ? ((totalProfit / eventBoosts.reduce((sum, b) => sum + parseFloat(b.price), 0)) * 100) : 0
        };
      })
    );

    // Filtrar eventos sem boosts
    const filteredProfitData = profitData.filter(d => d !== null);

    // 5. Calcular totais gerais
    const totalProfit = filteredProfitData.reduce((sum, d) => sum + (d?.totalProfit || 0), 0);
    const totalBoostCost = filteredProfitData.reduce((sum, d) => sum + (d?.totalBoostCost || 0), 0);
    const totalTicketSales = filteredProfitData.reduce((sum, d) => sum + (d?.totalTicketSales || 0), 0);
    const overallROI = totalBoostCost > 0 ? ((totalProfit / totalBoostCost) * 100) : 0;

    console.log('✅ [API Boost] Lucro calculado:', filteredProfitData.length, 'eventos');

    return NextResponse.json({
      success: true,
      data: {
        events: filteredProfitData,
        summary: {
          totalProfit,
          totalBoostCost,
          totalTicketSales,
          overallROI,
          totalEvents: filteredProfitData.length,
          commissionPercent: ORGANIZER_COMMISSION_PERCENT
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Boost] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}



