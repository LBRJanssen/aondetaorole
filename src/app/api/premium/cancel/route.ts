import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/premium/cancel - Cancelar assinatura
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API Premium] POST /cancel - Iniciando...');

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

    // 2. Pegar motivo (opcional)
    let reason = '';
    try {
      const body = await request.json();
      reason = body.reason || '';
    } catch {
      // Body vazio é OK
    }

    // 3. Buscar assinatura ativa
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('premium_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      console.log('❌ [API Premium] Nenhuma assinatura ativa');
      return NextResponse.json({ 
        error: 'Nenhuma assinatura ativa encontrada',
        code: 'NO_ACTIVE_SUBSCRIPTION'
      }, { status: 404 });
    }

    const now = new Date();

    // 4. Cancelar assinatura (mantém ativa até expirar)
    const { error: updateError } = await supabaseAdmin
      .from('premium_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        auto_renew: false,
        updated_at: now.toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('❌ [API Premium] Erro ao cancelar:', updateError);
      return NextResponse.json({ error: 'Erro ao cancelar assinatura' }, { status: 500 });
    }

    // Calcular dias restantes
    const expiresAt = new Date(subscription.expires_at);
    const diffTime = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    console.log('✅ [API Premium] Cancelada:', subscription.id, '| Dias restantes:', daysRemaining);

    // NOTA: O usuário mantém o premium até a data de expiração
    // Não removemos is_premium=true imediatamente

    return NextResponse.json({
      success: true,
      message: 'Assinatura cancelada com sucesso',
      data: {
        subscriptionId: subscription.id,
        cancelledAt: now.toISOString(),
        expiresAt: subscription.expires_at,
        daysRemaining,
        note: `Você ainda terá acesso premium até ${expiresAt.toLocaleDateString('pt-BR')}`
      }
    });

  } catch (error: any) {
    console.error('❌ [API Premium] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

