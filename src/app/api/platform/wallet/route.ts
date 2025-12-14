import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLATFORM_EMAIL = 'platform@finance.com';

// Helper para buscar usuário plataforma
async function getPlatformUserId(): Promise<string | null> {
  // Tenta buscar pelo email no auth
  const { data: platformUser, error: platformUserError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (!platformUserError && platformUser?.users) {
    const platform = platformUser.users.find(u => u.email === PLATFORM_EMAIL);
    if (platform) {
      return platform.id;
    }
  }

  // Se não encontrou, tenta buscar pelo perfil
  const { data: platformProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('email', PLATFORM_EMAIL)
    .single();
  
  return platformProfile?.id || null;
}

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

// GET /api/platform/wallet - Obter saldo e informações da carteira da plataforma
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Platform] GET /wallet - Iniciando...');

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

    // 3. Buscar usuário plataforma
    const platformUserId = await getPlatformUserId();
    if (!platformUserId) {
      return NextResponse.json({ error: 'Usuário plataforma não encontrado' }, { status: 404 });
    }

    // 4. Buscar as duas carteiras da plataforma (platform_boost e platform_ticket)
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', platformUserId)
      .in('wallet_type', ['platform_boost', 'platform_ticket']);

    if (walletsError) {
      console.error('❌ [API Platform] Erro ao buscar carteiras:', walletsError);
      return NextResponse.json({ error: 'Erro ao buscar carteiras' }, { status: 500 });
    }

    // Separar as carteiras
    const boostWallet = wallets?.find(w => w.wallet_type === 'platform_boost');
    const ticketWallet = wallets?.find(w => w.wallet_type === 'platform_ticket');

    // Criar carteiras se não existirem
    if (!boostWallet) {
      const { data: newBoostWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({ 
          user_id: platformUserId,
          wallet_type: 'platform_boost',
          balance: 0.00,
          total_deposited: 0.00,
          total_withdrawn: 0.00
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [API Platform] Erro ao criar carteira boost:', createError);
      }
    }

    if (!ticketWallet) {
      const { data: newTicketWallet, error: createError } = await supabaseAdmin
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
        console.error('❌ [API Platform] Erro ao criar carteira ticket:', createError);
      }
    }

    // Buscar novamente após criação
    const { data: allWallets } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', platformUserId)
      .in('wallet_type', ['platform_boost', 'platform_ticket']);

    const finalBoostWallet = allWallets?.find(w => w.wallet_type === 'platform_boost');
    const finalTicketWallet = allWallets?.find(w => w.wallet_type === 'platform_ticket');

    // 5. Buscar estatísticas de transações (últimos 30 dias) das carteiras da plataforma
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Buscar transações da plataforma via platform_transactions
    const { data: platformTransactions } = await supabaseAdmin
      .from('platform_transactions')
      .select('wallet_type, commission_amount, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // Separar por tipo
    const boostTransactions30Days = platformTransactions?.filter(tx => tx.wallet_type === 'boost') || [];
    const ticketTransactions30Days = platformTransactions?.filter(tx => tx.wallet_type === 'ticket') || [];

    const boostRevenue30Days = boostTransactions30Days.reduce((sum, tx) => sum + parseFloat(tx.commission_amount), 0);
    const ticketRevenue30Days = ticketTransactions30Days.reduce((sum, tx) => sum + parseFloat(tx.commission_amount), 0);

    const totalBalance = (parseFloat(finalBoostWallet?.balance || '0') || 0) + (parseFloat(finalTicketWallet?.balance || '0') || 0);

    return NextResponse.json({
      success: true,
      data: {
        boostWallet: {
          id: finalBoostWallet?.id,
          balance: parseFloat(finalBoostWallet?.balance || '0') || 0,
          totalDeposited: parseFloat(finalBoostWallet?.total_deposited || '0') || 0,
          totalWithdrawn: parseFloat(finalBoostWallet?.total_withdrawn || '0') || 0,
          revenue30Days: boostRevenue30Days,
          transactions30Days: boostTransactions30Days.length
        },
        ticketWallet: {
          id: finalTicketWallet?.id,
          balance: parseFloat(finalTicketWallet?.balance || '0') || 0,
          totalDeposited: parseFloat(finalTicketWallet?.total_deposited || '0') || 0,
          totalWithdrawn: parseFloat(finalTicketWallet?.total_withdrawn || '0') || 0,
          revenue30Days: ticketRevenue30Days,
          transactions30Days: ticketTransactions30Days.length
        },
        totalBalance,
        currency: 'BRL'
      }
    });

  } catch (error: any) {
    console.error('❌ [API Platform] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar carteira da plataforma',
      details: error.message 
    }, { status: 500 });
  }
}

// GET /api/platform/wallet/history - Obter histórico de transações
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Platform] POST /wallet/history - Iniciando...');

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
    const body = await request.json();
    const { page = 1, limit = 20, type, startDate, endDate } = body;

    // 4. Buscar usuário plataforma
    const platformUserId = await getPlatformUserId();
    if (!platformUserId) {
      return NextResponse.json({ error: 'Usuário plataforma não encontrado' }, { status: 404 });
    }

    // 5. Construir query
    let query = supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', platformUserId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', new Date(endDate).toISOString());
    }

    const { data: transactions, error: transactionsError, count } = await query;

    if (transactionsError) {
      console.error('❌ [API Platform] Erro ao buscar transações:', transactionsError);
      return NextResponse.json({ error: 'Erro ao buscar transações' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Platform] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar histórico',
      details: error.message 
    }, { status: 500 });
  }
}

