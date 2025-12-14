import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Esta rota requer autenticação e permissões de admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
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

    // Busca o usuário pelo email para obter o ID
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ [API] Erro ao buscar usuário:', userError);
      return NextResponse.json(
        { error: 'Erro ao buscar usuário', details: userError.message },
        { status: 500 }
      );
    }

    const user = userData?.users?.find(u => u.email === email.toLowerCase().trim());
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // URL de redirecionamento
    // Usamos /auth/callback como redirect_to porque o Supabase está removendo o caminho
    // A rota /auth/callback processa o token e redireciona para /reset-password
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, ''); // Remove barra final
    const redirectUrl = `${appUrl}/auth/callback`;
    
    console.log('🔗 [API] Gerando link de reset para:', email);
    console.log('🔗 [API] URL de redirecionamento (callback):', redirectUrl);
    console.log('🔗 [API] App URL base:', appUrl);
    console.log('🔗 [API] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

    // IMPORTANTE: A URL http://localhost:3000/auth/callback deve estar em 
    // Authentication > URL Configuration > Redirect URLs
    
    // Envia email de redefinição de senha
    // Usa /auth/callback que sempre funciona, mesmo se Supabase remover caminhos
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('❌ [API] Erro ao enviar email:', error);
      console.error('❌ [API] Detalhes do erro:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Erro ao enviar email de redefinição de senha', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [API] Email de reset enviado com sucesso para:', email);
    console.log('✅ [API] URL de redirecionamento usada:', redirectUrl);

    return NextResponse.json({
      success: true,
      message: `Email de redefinição de senha enviado para ${email}`,
    });
  } catch (error: any) {
    console.error('❌ [API] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}

