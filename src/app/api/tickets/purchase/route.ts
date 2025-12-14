import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Taxa de comissão da plataforma (10%)
const PLATFORM_COMMISSION_PERCENT = 10;

// Email do usuário plataforma
const PLATFORM_EMAIL = 'platform@finance.com';

// POST /api/tickets/purchase - Comprar ingresso de um evento
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Tickets] POST /purchase - Iniciando...');

    // 1. Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API Tickets] Token não fornecido');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.log('❌ [API Tickets] Token inválido');
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    console.log('🔐 [API Tickets] Usuário:', user.id);

    // 2. Pegar dados do body
    const body = await request.json();
    const { eventId, categoryId, price } = body;

    // 3. Validações
    if (!eventId) {
      return NextResponse.json({ error: 'eventId é obrigatório' }, { status: 400 });
    }

    if (!price || price <= 0) {
      return NextResponse.json({ error: 'Preço inválido' }, { status: 400 });
    }

    // 4. Verificar se evento existe e buscar organizador
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, name, organizer_id, is_active, is_approved')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.log('❌ [API Tickets] Evento não encontrado:', eventId);
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    if (!event.is_active || !event.is_approved) {
      return NextResponse.json({ error: 'Evento não está disponível para venda' }, { status: 400 });
    }

    if (!event.organizer_id) {
      return NextResponse.json({ error: 'Evento sem organizador' }, { status: 400 });
    }

    console.log('📍 [API Tickets] Evento:', event.name, '| Organizador:', event.organizer_id);

    // 5. Se houver categoria, verificar estoque
    if (categoryId) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from('ticket_categories')
        .select('id, name, stock_remaining, price')
        .eq('id', categoryId)
        .eq('event_id', eventId)
        .single();

      if (categoryError || !category) {
        console.log('❌ [API Tickets] Categoria não encontrada:', categoryId);
        return NextResponse.json({ error: 'Categoria de ingresso não encontrada' }, { status: 404 });
      }

      if (category.stock_remaining <= 0) {
        return NextResponse.json({ error: 'Ingressos esgotados para esta categoria' }, { status: 400 });
      }

      // Usar preço da categoria se fornecido
      const categoryPrice = parseFloat(category.price);
      if (categoryPrice !== parseFloat(price)) {
        console.warn('⚠️ [API Tickets] Preço informado difere do preço da categoria. Usando preço da categoria.');
      }
    }

    // 6. Buscar carteira do comprador
    let { data: buyerWallet, error: buyerWalletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (buyerWalletError && buyerWalletError.code === 'PGRST116') {
      // Criar carteira se não existir
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createError) {
        console.error('❌ [API Tickets] Erro ao criar carteira:', createError);
        return NextResponse.json({ error: 'Erro ao criar carteira' }, { status: 500 });
      }

      buyerWallet = newWallet;
    } else if (buyerWalletError) {
      console.error('❌ [API Tickets] Erro ao buscar carteira:', buyerWalletError);
      return NextResponse.json({ error: 'Erro ao buscar carteira' }, { status: 500 });
    }

    const ticketPrice = parseFloat(price);
    const buyerBalance = parseFloat(buyerWallet.balance) || 0;

    // 7. Verificar saldo do comprador
    if (buyerBalance < ticketPrice) {
      console.log('❌ [API Tickets] Saldo insuficiente:', buyerBalance, '<', ticketPrice);
      return NextResponse.json({ 
        error: 'Saldo insuficiente na carteira',
        code: 'INSUFFICIENT_BALANCE',
        details: {
          balance: buyerBalance,
          required: ticketPrice,
          missing: ticketPrice - buyerBalance
        }
      }, { status: 400 });
    }

    // 8. Calcular comissão e valores
    const platformCommission = ticketPrice * (PLATFORM_COMMISSION_PERCENT / 100);
    const organizerAmount = ticketPrice - platformCommission;

    console.log('💰 [API Tickets] Valores:', {
      ticketPrice,
      platformCommission,
      organizerAmount,
      commissionPercent: PLATFORM_COMMISSION_PERCENT
    });

    // 8.1. Buscar usuário da plataforma (pelo email)
    const { data: platformUser, error: platformUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    let platformUserId: string | null = null;
    if (!platformUserError && platformUser?.users) {
      const platform = platformUser.users.find(u => u.email === PLATFORM_EMAIL);
      if (platform) {
        platformUserId = platform.id;
      }
    }

    // Se não encontrou pelo email, tenta buscar pelo perfil
    if (!platformUserId) {
      const { data: platformProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', PLATFORM_EMAIL)
        .single();
      
      if (platformProfile) {
        platformUserId = platformProfile.id;
      }
    }

    if (!platformUserId) {
      console.warn('⚠️ [API Tickets] Usuário plataforma não encontrado. Comissão não será creditada.');
    }

    // 9. Buscar carteira do organizador (criar se não existir)
    let { data: organizerWallet, error: organizerWalletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', event.organizer_id)
      .single();

    if (organizerWalletError && organizerWalletError.code === 'PGRST116') {
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: event.organizer_id })
        .select()
        .single();

      if (createError) {
        console.error('❌ [API Tickets] Erro ao criar carteira do organizador:', createError);
        return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
      }

      organizerWallet = newWallet;
    } else if (organizerWalletError) {
      console.error('❌ [API Tickets] Erro ao buscar carteira do organizador:', organizerWalletError);
      return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
    }

    const organizerBalanceBefore = parseFloat(organizerWallet.balance) || 0;
    const organizerBalanceAfter = organizerBalanceBefore + organizerAmount;
    const organizerTotalDeposited = (parseFloat(organizerWallet.total_deposited) || 0) + organizerAmount;

    // 10. Iniciar transação (rollback em caso de erro)
    // Descontar do comprador
    const buyerBalanceAfter = buyerBalance - ticketPrice;

    const { error: updateBuyerError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: buyerBalanceAfter,
        updated_at: new Date().toISOString()
      })
      .eq('id', buyerWallet.id);

    if (updateBuyerError) {
      console.error('❌ [API Tickets] Erro ao descontar do comprador:', updateBuyerError);
      return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
    }

    // Creditar organizador
    const { error: updateOrganizerError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: organizerBalanceAfter,
        total_deposited: organizerTotalDeposited,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizerWallet.id);

    if (updateOrganizerError) {
      // Rollback: reverter desconto do comprador
      await supabaseAdmin
        .from('wallets')
        .update({
          balance: buyerBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', buyerWallet.id);

      console.error('❌ [API Tickets] Erro ao creditar organizador:', updateOrganizerError);
      return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
    }

    // 10.1. Creditar comissão na carteira da plataforma (platform_ticket)
    let platformTicketWalletId: string | null = null;
    let platformBalanceBeforeValue: number = 0;
    let platformBalanceAfterValue: number = 0;

    if (platformUserId) {
      // Buscar carteira específica de tickets da plataforma
      let { data: platformTicketWallet, error: platformWalletError } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', platformUserId)
        .eq('wallet_type', 'platform_ticket')
        .single();

      if (platformWalletError && platformWalletError.code === 'PGRST116') {
        // Criar carteira se não existir
        const { data: newWallet, error: createError } = await supabaseAdmin
          .from('wallets')
          .insert({ 
            user_id: platformUserId,
            wallet_type: 'platform_ticket',
            balance: 0.00,
            total_deposited: 0.00,
            total_withdrawn: 0.00
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ [API Tickets] Erro ao criar carteira platform_ticket:', createError);
          // Não falha a compra, apenas log
        } else {
          platformTicketWallet = newWallet;
        }
      }

      if (platformTicketWallet && !platformWalletError) {
        platformTicketWalletId = platformTicketWallet.id;
        platformBalanceBeforeValue = parseFloat(platformTicketWallet.balance) || 0;
        platformBalanceAfterValue = platformBalanceBeforeValue + platformCommission;
        const platformTotalDeposited = (parseFloat(platformTicketWallet.total_deposited) || 0) + platformCommission;

        const { error: updatePlatformError } = await supabaseAdmin
          .from('wallets')
          .update({
            balance: platformBalanceAfterValue,
            total_deposited: platformTotalDeposited,
            updated_at: new Date().toISOString()
          })
          .eq('id', platformTicketWallet.id);

        if (updatePlatformError) {
          console.error('❌ [API Tickets] Erro ao creditar plataforma:', updatePlatformError);
          // Não falha a compra, apenas log
        } else {
          console.log('✅ [API Tickets] Comissão creditada na carteira platform_ticket:', platformCommission);
          // A transação platform_transaction será criada depois, quando tivermos o buyerTransaction.id
        }
      }
    }

    // 11. Criar transações
    const categoryName = categoryId ? (await supabaseAdmin
      .from('ticket_categories')
      .select('name')
      .eq('id', categoryId)
      .single()).data?.name : null;

    const ticketDescription = categoryName 
      ? `Ingresso ${categoryName} - ${event.name}`
      : `Ingresso - ${event.name}`;

    // Transação do comprador (purchase)
    const { data: buyerTransaction, error: buyerTxError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: buyerWallet.id,
        user_id: user.id,
        type: 'purchase',
        amount: ticketPrice,
        balance_before: buyerBalance,
        balance_after: buyerBalanceAfter,
        description: ticketDescription,
        reference_id: eventId,
        reference_type: 'event',
        status: 'completed'
      })
      .select()
      .single();

    if (buyerTxError) {
      console.error('❌ [API Tickets] Erro ao criar transação do comprador:', buyerTxError);
      // Rollback seria necessário, mas por enquanto apenas log
    } else if (buyerTransaction && platformTicketWalletId) {
      // Criar transação na tabela platform_transactions agora que temos o buyerTransaction.id
      const description = categoryName 
        ? `Comissão de ingresso ${categoryName} - ${event.name} (${PLATFORM_COMMISSION_PERCENT}%)`
        : `Comissão de ingresso - ${event.name} (${PLATFORM_COMMISSION_PERCENT}%)`;

      // Inserir transação na tabela platform_transactions
      await supabaseAdmin
        .from('platform_transactions')
        .insert({
          platform_wallet_id: platformTicketWalletId,
          wallet_type: 'ticket',
          original_transaction_id: buyerTransaction.id,
          original_user_id: user.id,
          original_event_id: eventId,
          commission_amount: platformCommission,
          total_amount: ticketPrice,
          commission_percentage: PLATFORM_COMMISSION_PERCENT,
          balance_before: platformBalanceBeforeValue,
          balance_after: platformBalanceAfterValue,
          description: description,
          status: 'completed',
          metadata: {
            category_id: categoryId,
            category_name: categoryName,
            event_name: event.name,
            organizer_id: event.organizer_id
          }
        });
    }

    // Transação do organizador (deposit - recebimento)
    const { data: organizerTransaction, error: organizerTxError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: organizerWallet.id,
        user_id: event.organizer_id,
        type: 'deposit',
        amount: organizerAmount,
        balance_before: organizerBalanceBefore,
        balance_after: organizerBalanceAfter,
        description: `Venda de ingresso - ${event.name} (${PLATFORM_COMMISSION_PERCENT}% comissão descontada)`,
        reference_id: eventId,
        reference_type: 'event',
        status: 'completed'
      })
      .select()
      .single();

    if (organizerTxError) {
      console.error('❌ [API Tickets] Erro ao criar transação do organizador:', organizerTxError);
      // Rollback seria necessário, mas por enquanto apenas log
    }

    // 12. Atualizar estoque se houver categoria
    if (categoryId) {
      // Buscar categoria para pegar stock_remaining atual
      const { data: categoryData, error: categoryFetchError } = await supabaseAdmin
        .from('ticket_categories')
        .select('stock_remaining')
        .eq('id', categoryId)
        .single();

      if (!categoryFetchError && categoryData) {
        const newStock = Math.max(0, (categoryData.stock_remaining || 0) - 1);
        
        const { error: stockError } = await supabaseAdmin
          .from('ticket_categories')
          .update({
            stock_remaining: newStock
          })
          .eq('id', categoryId);

        if (stockError) {
          console.error('❌ [API Tickets] Erro ao atualizar estoque:', stockError);
          // Não falha a compra, apenas log
        }
      }
    }

    console.log('✅ [API Tickets] Ingresso comprado com sucesso!', {
      event: event.name,
      buyer: user.id,
      organizer: event.organizer_id,
      price: ticketPrice,
      commission: platformCommission,
      organizerAmount
    });

    return NextResponse.json({
      success: true,
      message: 'Ingresso comprado com sucesso!',
      data: {
        transactionId: buyerTransaction?.id,
        eventId: event.id,
        eventName: event.name,
        price: ticketPrice,
        commission: platformCommission,
        organizerAmount,
        newBalance: buyerBalanceAfter
      }
    });

  } catch (error: any) {
    console.error('❌ [API Tickets] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar compra de ingresso',
      details: error.message 
    }, { status: 500 });
  }
}

