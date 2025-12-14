import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Valida formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    console.log('🔑 [ForgotPassword] Solicitação de reset para:', email);

    // URL de redirecionamento
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const redirectUrl = `${appUrl}/auth/callback`;
    
    console.log('🔗 [ForgotPassword] Redirect URL:', redirectUrl);

    // Envia email de redefinição de senha
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('❌ [ForgotPassword] Erro:', error);
      // Não revelar se o email existe ou não por segurança
      // Sempre retornar sucesso para evitar enumeration de emails
    }

    // Sempre retorna sucesso para evitar enumeration de emails
    console.log('✅ [ForgotPassword] Processado para:', email);

    return NextResponse.json({
      success: true,
      message: 'Se o email existir em nossa base, você receberá um link de recuperação.',
    });
  } catch (error: any) {
    console.error('❌ [ForgotPassword] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

