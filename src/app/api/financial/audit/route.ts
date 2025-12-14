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

// GET /api/financial/audit - Informações de auditoria do usuário financeiro
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Financial] GET /audit - Iniciando...');

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

    // 3. Buscar perfil do usuário
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // 4. Buscar último login (última sessão do auth)
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    const lastLogin = session?.user?.last_sign_in_at || null;

    // 5. Buscar ações recentes (transações financeiras que o usuário processou)
    // Por enquanto, vamos buscar as últimas ações relacionadas a aprovações/recusas de saques
    // Isso pode ser expandido com uma tabela de logs de ações no futuro
    const { data: recentActions } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, type, amount, description, created_at, status')
      .or('type.eq.withdraw,type.eq.deposit')
      .order('created_at', { ascending: false })
      .limit(20);

    const actions = (recentActions || []).map(action => ({
      id: action.id,
      type: action.type,
      description: action.description,
      amount: parseFloat(action.amount),
      status: action.status,
      timestamp: action.created_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: profile?.name || user.email,
          role: profile?.user_type || 'unknown',
          createdAt: profile?.created_at || user.created_at
        },
        lastLogin: lastLogin ? new Date(lastLogin).toISOString() : null,
        recentActions: actions.slice(0, 10) // Últimas 10 ações
      }
    });

  } catch (error: any) {
    console.error('❌ [API Financial] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar informações de auditoria',
      details: error.message 
    }, { status: 500 });
  }
}



