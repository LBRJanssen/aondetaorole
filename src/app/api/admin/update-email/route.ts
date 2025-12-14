import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Esta rota requer autenticação e permissões de owner ou admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newEmail, requesterId } = body;

    if (!userId || !newEmail || !requesterId) {
      return NextResponse.json(
        { error: 'userId, newEmail e requesterId são obrigatórios' },
        { status: 400 }
      );
    }

    // Valida formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Verifica se tem Service Role Key configurada
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('❌ [API] Service Role Key ou Supabase URL não configurados');
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      );
    }

    // Cria cliente admin com Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verifica se o requester é owner ou admin
    const { data: requesterData, error: requesterError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type')
      .eq('id', requesterId)
      .single();

    if (requesterError || !requesterData) {
      console.error('❌ [API] Erro ao verificar permissões:', requesterError);
      return NextResponse.json(
        { error: 'Erro ao verificar permissões' },
        { status: 403 }
      );
    }

    if (!['owner', 'admin'].includes(requesterData.user_type)) {
      console.error('❌ [API] Usuário sem permissão para alterar email:', requesterId);
      return NextResponse.json(
        { error: 'Apenas Owner e Admin podem alterar emails de usuários' },
        { status: 403 }
      );
    }

    // Busca o cargo do usuário alvo para verificar hierarquia
    const { data: targetUserData, error: targetUserError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type, name')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUserData) {
      console.error('❌ [API] Usuário alvo não encontrado:', targetUserError);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Hierarquia: owner > admin > moderacao > suporte > premium > common
    const hierarchy: { [key: string]: number } = {
      'owner': 6,
      'admin': 5,
      'moderacao': 4,
      'suporte': 3,
      'premium': 2,
      'common': 1,
    };

    const requesterLevel = hierarchy[requesterData.user_type] || 0;
    const targetLevel = hierarchy[targetUserData.user_type] || 0;

    // Owner pode alterar qualquer um
    // Admin NÃO pode alterar Owner nem outros Admins (apenas cargos abaixo ou a si mesmo)
    if (requesterData.user_type === 'admin') {
      // Admin tentando alterar owner
      if (targetUserData.user_type === 'owner') {
        console.error('❌ [API] Admin tentando alterar email de Owner');
        return NextResponse.json(
          { error: 'Administradores não podem alterar o email do Owner' },
          { status: 403 }
        );
      }
      
      // Admin tentando alterar outro admin (que não seja ele mesmo)
      if (targetUserData.user_type === 'admin' && userId !== requesterId) {
        console.error('❌ [API] Admin tentando alterar email de outro Admin');
        return NextResponse.json(
          { error: 'Administradores não podem alterar o email de outros Administradores' },
          { status: 403 }
        );
      }
    }

    console.log('✅ [API] Permissão de hierarquia verificada:', {
      requester: requesterData.user_type,
      target: targetUserData.user_type,
      isSelf: userId === requesterId,
    });

    // Verifica se o email já está em uso
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailInUse = existingUser?.users?.some(
      u => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== userId
    );

    if (emailInUse) {
      return NextResponse.json(
        { error: 'Este email já está em uso por outro usuário' },
        { status: 400 }
      );
    }

    console.log('📧 [API] Alterando email do usuário:', { userId, newEmail, requesterId });

    // Atualiza o email usando a Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail.toLowerCase().trim(),
      email_confirm: true, // Confirma o email automaticamente
    });

    if (error) {
      console.error('❌ [API] Erro ao atualizar email:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar email', details: error.message },
        { status: 500 }
      );
    }

    // Atualiza também na tabela user_profiles
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ email: newEmail.toLowerCase().trim() })
      .eq('id', userId);

    if (profileError) {
      console.error('⚠️ [API] Erro ao atualizar email no profile (não crítico):', profileError);
    }

    console.log('✅ [API] Email atualizado com sucesso:', { userId, newEmail });

    return NextResponse.json({
      success: true,
      message: `Email atualizado para ${newEmail}`,
      user: data.user,
    });
  } catch (error: any) {
    console.error('❌ [API] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}

