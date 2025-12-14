import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/tickets/[id]/messages - Enviar mensagem no ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    console.log('🔧 [API Tickets] POST /', ticketId, '/messages');

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

    // 3. Verificar se ticket está fechado
    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket está fechado e não aceita novas mensagens' }, { status: 400 });
    }

    // 4. Verificar permissão
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type, name')
      .eq('id', user.id)
      .single();

    const userType = profile?.user_type || 'common';
    const isStaff = ['owner', 'admin', 'moderacao', 'suporte'].includes(userType);
    const isOwner = ticket.user_id === user.id;

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Sem permissão para responder este ticket' }, { status: 403 });
    }

    // 5. Pegar dados do body
    const body = await request.json();
    const { message, attachments = [], isInternal = false } = body;

    // 6. Validações
    if (!message || message.trim().length < 2) {
      return NextResponse.json({ error: 'Mensagem deve ter pelo menos 2 caracteres' }, { status: 400 });
    }

    // Mensagens internas só para staff
    const finalIsInternal = isStaff ? isInternal : false;

    // 7. Determinar tipo de sender
    let senderType: 'user' | 'support' | 'admin' = 'user';
    if (isStaff) {
      senderType = ['owner', 'admin'].includes(userType) ? 'admin' : 'support';
    }

    // 8. Criar mensagem
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_name: profile?.name || 'Usuário',
        sender_type: senderType,
        message: message.trim(),
        attachments,
        is_internal: finalIsInternal
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ [API Tickets] Erro ao criar mensagem:', messageError);
      return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 });
    }

    // 9. Atualizar status do ticket
    let newStatus = ticket.status;
    if (isOwner && ticket.status === 'waiting_user') {
      newStatus = 'in_progress';
    } else if (isStaff && ticket.status === 'open') {
      newStatus = 'in_progress';
    } else if (isStaff && !finalIsInternal) {
      newStatus = 'waiting_user';
    }

    if (newStatus !== ticket.status) {
      await supabaseAdmin
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
    }

    // 10. Se é staff e não está atribuído, auto-atribuir
    if (isStaff && !ticket.assigned_to && !finalIsInternal) {
      await supabaseAdmin
        .from('tickets')
        .update({ 
          assigned_to: user.id, 
          assigned_at: new Date().toISOString() 
        })
        .eq('id', ticketId);
    }

    console.log('✅ [API Tickets] Mensagem enviada:', newMessage.id);

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: {
        messageId: newMessage.id,
        message: newMessage.message,
        senderType: newMessage.sender_type,
        senderName: newMessage.sender_name,
        isInternal: newMessage.is_internal,
        createdAt: newMessage.created_at,
        ticketStatus: newStatus
      }
    });

  } catch (error: any) {
    console.error('❌ [API Tickets] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

