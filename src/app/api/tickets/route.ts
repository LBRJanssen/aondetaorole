import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tickets - Listar tickets do usuário
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Tickets] GET - Iniciando...');

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const status = searchParams.get('status'); // open, in_progress, resolved, closed
    const offset = (page - 1) * limit;

    // 3. Verificar se é suporte/admin (vê todos os tickets)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    const isStaff = ['owner', 'admin', 'moderacao', 'suporte'].includes(profile?.user_type || '');

    // 4. Construir query
    let query = supabaseAdmin
      .from('tickets')
      .select(`
        *,
        ticket_categories:category_id (name, icon),
        assigned_user:assigned_to (id)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Se não é staff, filtra apenas tickets do usuário
    if (!isStaff) {
      query = query.eq('user_id', user.id);
    }

    // Filtro de status
    if (status) {
      query = query.eq('status', status);
    }

    // 5. Executar
    const { data: tickets, error, count } = await query;

    if (error) {
      console.error('❌ [API Tickets] Erro:', error);
      return NextResponse.json({ error: 'Erro ao buscar tickets' }, { status: 500 });
    }

    // 6. Contar mensagens não lidas de cada ticket
    const ticketsWithUnread = await Promise.all(
      (tickets || []).map(async (ticket) => {
        const { count: unreadCount } = await supabaseAdmin
          .from('ticket_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return {
          ...ticket,
          unreadMessages: unreadCount || 0
        };
      })
    );

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    console.log('✅ [API Tickets] Tickets:', tickets?.length, '| Total:', total);

    return NextResponse.json({
      success: true,
      data: {
        tickets: ticketsWithUnread.map(t => ({
          id: t.id,
          subject: t.subject,
          description: t.description,
          category: t.ticket_categories?.name || 'Outro',
          categoryIcon: t.ticket_categories?.icon || 'help-circle',
          status: t.status,
          statusLabel: getStatusLabel(t.status),
          priority: t.priority,
          priorityLabel: getPriorityLabel(t.priority),
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          resolvedAt: t.resolved_at,
          unreadMessages: t.unreadMessages,
          rating: t.rating,
          isAssigned: !!t.assigned_to
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        },
        isStaff
      }
    });

  } catch (error: any) {
    console.error('❌ [API Tickets] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/tickets - Criar novo ticket
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Tickets] POST - Criando ticket...');

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

    // 2. Pegar dados do body
    const body = await request.json();
    const { 
      subject, 
      description, 
      categoryId, 
      priority = 'normal',
      details = {},
      attachments = []
    } = body;

    // 3. Validações
    if (!subject || subject.trim().length < 5) {
      return NextResponse.json({ error: 'Assunto deve ter pelo menos 5 caracteres' }, { status: 400 });
    }

    if (!description || description.trim().length < 20) {
      return NextResponse.json({ error: 'Descrição deve ter pelo menos 20 caracteres' }, { status: 400 });
    }

    // 4. Buscar dados do usuário
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('name, email')
      .eq('id', user.id)
      .single();

    // 5. Coletar informações do dispositivo automaticamente
    const userAgent = request.headers.get('user-agent') || '';
    const autoDetails = {
      ...details,
      userAgent,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString()
    };

    // 6. Criar ticket
    const { data: ticket, error: createError } = await supabaseAdmin
      .from('tickets')
      .insert({
        user_id: user.id,
        user_email: profile?.email || user.email,
        user_name: profile?.name || 'Usuário',
        subject: subject.trim(),
        description: description.trim(),
        category_id: categoryId || null,
        priority,
        details: autoDetails,
        attachments,
        status: 'open'
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ [API Tickets] Erro ao criar:', createError);
      return NextResponse.json({ error: 'Erro ao criar ticket' }, { status: 500 });
    }

    // 7. Criar mensagem inicial (descrição)
    await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_name: profile?.name || 'Usuário',
        sender_type: 'user',
        message: description.trim(),
        attachments
      });

    console.log('✅ [API Tickets] Ticket criado:', ticket.id);

    return NextResponse.json({
      success: true,
      message: 'Ticket criado com sucesso! Nossa equipe responderá em breve.',
      data: {
        ticketId: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.created_at
      }
    });

  } catch (error: any) {
    console.error('❌ [API Tickets] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Helpers
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: 'Aberto',
    in_progress: 'Em Andamento',
    waiting_user: 'Aguardando Resposta',
    resolved: 'Resolvido',
    closed: 'Fechado'
  };
  return labels[status] || status;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Baixa',
    normal: 'Normal',
    high: 'Alta',
    urgent: 'Urgente'
  };
  return labels[priority] || priority;
}

