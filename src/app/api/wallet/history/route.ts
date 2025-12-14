import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/wallet/history - Histórico de transações
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Wallet] GET /history - Iniciando...');

    // 1. Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API Wallet] Token não fornecido');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // 2. Verificar token e pegar usuário
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.log('❌ [API Wallet] Token inválido:', authError?.message);
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    console.log('🔐 [API Wallet] Usuário autenticado:', user.id);

    // 3. Pegar parâmetros de query
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Máximo 100
    const type = searchParams.get('type'); // deposit, withdraw, purchase, refund, boost, premium
    const status = searchParams.get('status'); // completed, pending, failed, cancelled

    const offset = (page - 1) * limit;

    console.log('📊 [API Wallet] Filtros - page:', page, '| limit:', limit, '| type:', type, '| status:', status);

    // 4. Buscar carteira do usuário
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (walletError) {
      if (walletError.code === 'PGRST116') {
        // Carteira não existe, retornar lista vazia
        console.log('⚠️ [API Wallet] Carteira não existe, retornando vazio');
        return NextResponse.json({
          success: true,
          data: {
            transactions: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasMore: false
            }
          }
        });
      }
      console.error('❌ [API Wallet] Erro ao buscar carteira:', walletError);
      return NextResponse.json({ error: 'Erro ao buscar carteira' }, { status: 500 });
    }

    // 5. Construir query de transações
    let query = supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros opcionais
    if (type) {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // 6. Executar query
    const { data: transactions, error: transactionsError, count } = await query;

    if (transactionsError) {
      console.error('❌ [API Wallet] Erro ao buscar transações:', transactionsError);
      return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    console.log('✅ [API Wallet] Transações encontradas:', transactions?.length, '| Total:', total);

    // 7. Formatar transações
    const formattedTransactions = transactions?.map(t => ({
      id: t.id,
      type: t.type,
      typeLabel: getTypeLabel(t.type),
      amount: parseFloat(t.amount),
      balanceBefore: parseFloat(t.balance_before),
      balanceAfter: parseFloat(t.balance_after),
      description: t.description,
      referenceId: t.reference_id,
      referenceType: t.reference_type,
      status: t.status,
      statusLabel: getStatusLabel(t.status),
      createdAt: t.created_at,
      currency: 'BRL'
    })) || [];

    // 8. Retornar resultado
    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API Wallet] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Helper: Label do tipo de transação
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    deposit: 'Depósito',
    withdraw: 'Saque',
    purchase: 'Compra',
    refund: 'Reembolso',
    boost: 'Boost de Evento',
    premium: 'Assinatura Premium'
  };
  return labels[type] || type;
}

// Helper: Label do status
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: 'Concluído',
    pending: 'Pendente',
    failed: 'Falhou',
    cancelled: 'Cancelado'
  };
  return labels[status] || status;
}

