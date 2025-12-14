import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tickets/[id] - Ver ticket específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    console.log('🔧 [API Tickets] GET /', ticketId);

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

    // 2. Verificar se é staff
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    const isStaff = ['owner', 'admin', 'moderacao', 'suporte'].includes(profile?.user_type || '');

    // 3. Buscar ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        ticket_categories:category_id (name, icon, description)
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    // 4. Verificar permissão (dono do ticket ou staff)
    if (ticket.user_id !== user.id && !isStaff) {
      return NextResponse.json({ error: 'Sem permissão para ver este ticket' }, { status: 403 });
    }

    // 5. Buscar mensagens
    const { data: messages } = await supabaseAdmin
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    // Filtrar mensagens internas se não é staff
    const filteredMessages = isStaff 
      ? messages 
      : messages?.filter(m => !m.is_internal);

    // 6. Marcar mensagens como lidas
    await supabaseAdmin
      .from('ticket_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('ticket_id', ticketId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    console.log('✅ [API Tickets] Ticket encontrado:', ticket.subject);

    return NextResponse.json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          category: ticket.ticket_categories?.name || 'Outro',
          categoryIcon: ticket.ticket_categories?.icon || 'help-circle',
          categoryDescription: ticket.ticket_categories?.description,
          status: ticket.status,
          statusLabel: getStatusLabel(ticket.status),
          priority: ticket.priority,
          priorityLabel: getPriorityLabel(ticket.priority),
          details: ticket.details,
          attachments: ticket.attachments,
          userId: ticket.user_id,
          userName: ticket.user_name,
          userEmail: ticket.user_email,
          assignedTo: ticket.assigned_to,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
          resolvedAt: ticket.resolved_at,
          closedAt: ticket.closed_at,
          rating: ticket.rating,
          ratingComment: ticket.rating_comment
        },
        messages: filteredMessages?.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          senderType: m.sender_type,
          message: m.message,
          attachments: m.attachments,
          isInternal: m.is_internal,
          isRead: m.is_read,
          createdAt: m.created_at
        })) || [],
        isOwner: ticket.user_id === user.id,
        isStaff,
        canReply: !['closed'].includes(ticket.status),
        canClose: ticket.user_id === user.id || isStaff,
        canRate: ticket.user_id === user.id && ticket.status === 'resolved' && !ticket.rating
      }
    });

  } catch (error: any) {
    console.error('❌ [API Tickets] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/tickets/[id] - Atualizar ticket (status, prioridade, atribuição)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    console.log('🔧 [API Tickets] PUT /', ticketId);

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

    // 2. Buscar ticket
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    // 3. Verificar permissão
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type, name')
      .eq('id', user.id)
      .single();

    const isStaff = ['owner', 'admin', 'moderacao', 'suporte'].includes(profile?.user_type || '');
    const isOwner = ticket.user_id === user.id;

    // 4. Pegar dados do body
    const body = await request.json();
    const { status, priority, assignedTo, rating, ratingComment } = body;

    // 5. Construir update
    const updateData: any = { updated_at: new Date().toISOString() };

    // Status - staff pode mudar qualquer, usuário só pode fechar
    if (status) {
      if (isStaff || (isOwner && ['closed'].includes(status))) {
        updateData.status = status;
        if (status === 'resolved') updateData.resolved_at = new Date().toISOString();
        if (status === 'closed') updateData.closed_at = new Date().toISOString();
      }
    }

    // Prioridade - só staff
    if (priority && isStaff) {
      updateData.priority = priority;
    }

    // Atribuição - só staff
    if (assignedTo !== undefined && isStaff) {
      updateData.assigned_to = assignedTo;
      updateData.assigned_at = assignedTo ? new Date().toISOString() : null;
    }

    // Avaliação - só dono do ticket
    if (rating && isOwner && ticket.status === 'resolved') {
      updateData.rating = rating;
      updateData.rating_comment = ratingComment || null;
    }

    // 6. Atualizar
    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [API Tickets] Erro ao atualizar:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar ticket' }, { status: 500 });
    }

    // 7. Criar mensagem de sistema se mudou status
    if (status && status !== ticket.status) {
      await supabaseAdmin
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_name: profile?.name || 'Sistema',
          sender_type: 'system',
          message: `Status alterado para: ${getStatusLabel(status)}`,
          is_internal: false
        });
    }

    console.log('✅ [API Tickets] Ticket atualizado');

    return NextResponse.json({
      success: true,
      message: 'Ticket atualizado com sucesso',
      data: {
        ticketId: updatedTicket.id,
        status: updatedTicket.status,
        priority: updatedTicket.priority
      }
    });

  } catch (error: any) {
    console.error('❌ [API Tickets] Erro:', error);
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

