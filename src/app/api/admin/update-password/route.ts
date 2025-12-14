import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Esta rota requer autenticação e permissões de owner ou admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newPassword, requesterId } = body;

    if (!userId || !newPassword || !requesterId) {
      return NextResponse.json(
        { error: 'userId, newPassword e requesterId são obrigatórios' },
        { status: 400 }
      );
    }

    // Valida a senha
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 6 caracteres' },
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
      console.error('❌ [API] Usuário sem permissão para alterar senha:', requesterId);
      return NextResponse.json(
        { error: 'Apenas Owner e Admin podem alterar senhas de usuários' },
        { status: 403 }
      );
    }

    // Busca informações do usuário alvo
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('user_profiles')
      .select('name, email, user_type')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      console.error('❌ [API] Usuário alvo não encontrado:', targetError);
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
    const targetLevel = hierarchy[targetUser.user_type] || 0;

    // Owner pode alterar qualquer um
    // Admin NÃO pode alterar Owner nem outros Admins (apenas cargos abaixo ou a si mesmo)
    if (requesterData.user_type === 'admin') {
      // Admin tentando alterar owner
      if (targetUser.user_type === 'owner') {
        console.error('❌ [API] Admin tentando alterar senha de Owner');
        return NextResponse.json(
          { error: 'Administradores não podem alterar a senha do Owner' },
          { status: 403 }
        );
      }
      
      // Admin tentando alterar outro admin (que não seja ele mesmo)
      if (targetUser.user_type === 'admin' && userId !== requesterId) {
        console.error('❌ [API] Admin tentando alterar senha de outro Admin');
        return NextResponse.json(
          { error: 'Administradores não podem alterar a senha de outros Administradores' },
          { status: 403 }
        );
      }
    }

    console.log('✅ [API] Permissão de hierarquia verificada:', {
      requester: requesterData.user_type,
      target: targetUser.user_type,
      isSelf: userId === requesterId,
    });

    console.log('🔐 [API] Alterando senha do usuário:', { userId, userName: targetUser.name, requesterId });

    // Atualiza a senha usando a Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error('❌ [API] Erro ao atualizar senha:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar senha', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [API] Senha atualizada com sucesso para:', targetUser.name);

    return NextResponse.json({
      success: true,
      message: `Senha de ${targetUser.name} atualizada com sucesso`,
    });
  } catch (error: any) {
    console.error('❌ [API] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}

