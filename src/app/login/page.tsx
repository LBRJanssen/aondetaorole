'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Phone } from 'lucide-react';
import { applyPhoneMask, sanitizeInput } from '@/utils/validation';
import { checkRateLimit, recordFailedAttempt, recordSuccess } from '@/utils/rateLimiter';
import { generateCaptcha, validateCaptcha } from '@/utils/captcha';
import { debugAuth, debugUI, debugForm, debugNavigation } from '@/utils/debug';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/home';
  
  const { login, loginWithGoogle, isAuthenticated, isLoading, resendConfirmationEmail } = useAuthStore();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [rateLimitError, setRateLimitError] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaAnswerValue, setCaptchaAnswerValue] = useState('');
  
  // Estados para recuperação de senha
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Log de montagem da página
  useEffect(() => {
    debugUI.pageLoad('Login');
  }, []);

  // Função para recuperação de senha
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    
    if (!forgotEmail) {
      setForgotError('Digite seu email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotError('Email inválido');
      return;
    }

    setForgotLoading(true);
    console.log('🔑 [ForgotPassword] Solicitando recuperação para:', forgotEmail);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar solicitação');
      }

      setForgotSuccess(true);
      console.log('✅ [ForgotPassword] Email de recuperação solicitado');
    } catch (error: any) {
      console.error('❌ [ForgotPassword] Erro:', error);
      setForgotError(error.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess(false);
  };

  // Redireciona se ja estiver logado
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      debugNavigation.redirect('Usuário já autenticado', redirect);
      // Preserva parâmetros de query na URL de redirecionamento
      try {
        const redirectUrl = new URL(redirect, window.location.origin);
        const currentParams = new URLSearchParams(window.location.search);
        
        // Adiciona parâmetros da URL atual ao redirecionamento (exceto 'redirect')
        currentParams.forEach((value, key) => {
          if (key !== 'redirect') {
            redirectUrl.searchParams.set(key, value);
          }
        });
        
        // Usa apenas o pathname + search params para evitar problemas com URLs absolutas
        const finalRedirect = redirectUrl.pathname + redirectUrl.search;
        router.push(finalRedirect);
      } catch {
        // Fallback se houver erro ao processar URL
        router.push(redirect);
      }
    }
  }, [isAuthenticated, router, redirect]);

  // Não verifica rate limiting ao montar - apenas quando tentar fazer login

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    debugUI.formSubmit('Login');
    setError('');
    setRateLimitError('');

    if (!emailOrPhone || !password) {
      debugForm.validation('campos', false, 'Campos vazios');
      setError('Preencha todos os campos');
      return;
    }

    // Verifica rate limiting
    const rateLimit = checkRateLimit('login');
    if (!rateLimit.allowed) {
      debugAuth.loginError({ message: 'Rate limit excedido', remainingTime: rateLimit.error });
      setRateLimitError(rateLimit.error || 'Muitas tentativas. Tente novamente mais tarde.');
      setShowCaptcha(true);
      const captcha = generateCaptcha();
      setCaptchaQuestion(captcha.question);
      return;
    }

    // Valida CAPTCHA se necessário
    if (showCaptcha) {
      if (!captchaAnswerValue.trim()) {
        debugForm.validation('captcha', false, 'CAPTCHA vazio');
        setError('Resolva o desafio matemático');
        return;
      }
      
      if (!validateCaptcha(captchaAnswerValue)) {
        debugForm.validation('captcha', false, 'Resposta incorreta');
        setError('Resposta incorreta. Tente novamente.');
        recordFailedAttempt('login');
        const captcha = generateCaptcha();
        setCaptchaQuestion(captcha.question);
        setCaptchaAnswerValue('');
        return;
      }
      debugForm.validation('captcha', true);
    }

    debugAuth.loginStart(emailOrPhone);

    try {
      await login(emailOrPhone, password);
      
      // Registra sucesso (reseta rate limiting)
      recordSuccess('login');
      debugAuth.loginSuccess('', emailOrPhone);
      
      // Preserva parâmetros de query na URL de redirecionamento
      if (typeof window !== 'undefined') {
        try {
          const redirectUrl = new URL(redirect, window.location.origin);
          const currentParams = new URLSearchParams(window.location.search);
          
          currentParams.forEach((value, key) => {
            if (key !== 'redirect') {
              redirectUrl.searchParams.set(key, value);
            }
          });
          
          const finalRedirect = redirectUrl.pathname + redirectUrl.search;
          debugNavigation.navigate('/login', finalRedirect);
          router.push(finalRedirect);
        } catch {
          router.push(redirect);
        }
      } else {
        router.push(redirect);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao fazer login';
      debugAuth.loginError(err);
      setError(errorMessage);
      
      // Registra tentativa falha
      recordFailedAttempt('login');
      
      // Verifica se precisa mostrar CAPTCHA após falha
      const newRateLimit = checkRateLimit('login');
      if (!newRateLimit.allowed || newRateLimit.remainingAttempts <= 2) {
        setShowCaptcha(true);
        const captcha = generateCaptcha();
        setCaptchaQuestion(captcha.question);
      }
      
      // Mostra opção de reenviar email se for erro de confirmação
      if (errorMessage.includes('Email não confirmado') || errorMessage.includes('email_not_confirmed')) {
        setShowResendEmail(true);
      } else {
        setShowResendEmail(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    debugUI.buttonClick('Login com Google');
    // Verifica rate limiting
    const rateLimit = checkRateLimit('login');
    if (!rateLimit.allowed) {
      debugAuth.loginError({ message: 'Rate limit excedido (Google)' });
      setRateLimitError(rateLimit.error || 'Muitas tentativas. Tente novamente mais tarde.');
      return;
    }

    debugAuth.loginStart('google-oauth');

    try {
      await loginWithGoogle();
      
      // Registra sucesso
      recordSuccess('login');
      debugAuth.loginSuccess('', 'google-oauth');
      
      // Preserva parâmetros de query
      if (typeof window !== 'undefined') {
        try {
          const redirectUrl = new URL(redirect, window.location.origin);
          const currentParams = new URLSearchParams(window.location.search);
          
          currentParams.forEach((value, key) => {
            if (key !== 'redirect') {
              redirectUrl.searchParams.set(key, value);
            }
          });
          
          const finalRedirect = redirectUrl.pathname + redirectUrl.search;
          debugNavigation.navigate('/login', finalRedirect);
          router.push(finalRedirect);
        } catch {
          router.push(redirect);
        }
      } else {
        router.push(redirect);
      }
    } catch (err: any) {
      debugAuth.loginError(err);
      setError(err.message || 'Erro ao fazer login com Google');
      recordFailedAttempt('login');
    }
  };

  const handleResendEmail = async () => {
    debugUI.buttonClick('Reenviar email de confirmação');
    if (!emailOrPhone || !emailOrPhone.includes('@')) {
      debugForm.validation('email', false, 'Email inválido para reenvio');
      setError('Digite um email válido para reenviar a confirmação');
      return;
    }

    setResendingEmail(true);
    setError('');
    console.log('📧 [Login] Reenviando email de confirmação para:', emailOrPhone.substring(0, 5) + '***');
    
    try {
      await resendConfirmationEmail(emailOrPhone);
      console.log('✅ [Login] Email de confirmação reenviado com sucesso');
      setError('');
      setShowResendEmail(false);
      alert('Email de confirmação reenviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error('❌ [Login] Erro ao reenviar email:', err);
      setError(err.message || 'Erro ao reenviar email de confirmação');
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12">
        <div className="w-full max-w-md mx-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-neon-pink to-neon-purple rounded-xl flex items-center justify-center">
              <LogIn size={32} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-3xl text-white mb-2">
              Entrar
            </h1>
            <p className="text-gray-400">
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Card do formulario */}
          <div className="card">
            {/* Erro */}
            {(error || rateLimitError) && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{rateLimitError || error}</p>
                </div>
                {showResendEmail && (
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendingEmail}
                    className="text-sm text-neon-pink hover:underline mt-2 disabled:opacity-50"
                  >
                    {resendingEmail ? 'Reenviando...' : 'Reenviar email de confirmação'}
                  </button>
                )}
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email ou Telefone */}
              <div>
                <label htmlFor="emailOrPhone" className="input-label">
                  Email ou Telefone
                </label>
                <div className="relative">
                  {emailOrPhone.includes('@') || (!emailOrPhone.match(/\d/) && emailOrPhone.length > 0) ? (
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  ) : (
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  )}
                  <input
                    type="text"
                    id="emailOrPhone"
                    value={emailOrPhone}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Se contém apenas números, aplica máscara de telefone
                      if (/^\d+$/.test(value.replace(/\D/g, '')) && value.replace(/\D/g, '').length > 0) {
                        let digits = value.replace(/\D/g, '');
                        if (digits.length > 11) digits = digits.slice(0, 11);
                        value = applyPhoneMask(digits);
                      } else {
                        // Se for email, sanitiza
                        value = sanitizeInput(value);
                      }
                      setEmailOrPhone(value);
                    }}
                    placeholder="seu@email.com ou (11) 99999-9999"
                    className="input-field pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label htmlFor="password" className="input-label">
                  Senha
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="input-field pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA */}
              {showCaptcha && (
                <div className="p-4 bg-dark-700 rounded-lg border border-dark-600">
                  <label htmlFor="captcha" className="input-label mb-2 block">
                    Verificação de segurança: {captchaQuestion} = ?
                  </label>
                  <input
                    type="text"
                    id="captcha"
                    value={captchaAnswerValue}
                    onChange={(e) => setCaptchaAnswerValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="Digite a resposta"
                    className="input-field"
                    maxLength={3}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const captcha = generateCaptcha();
                      setCaptchaQuestion(captcha.question);
                      setCaptchaAnswerValue('');
                    }}
                    className="text-xs text-neon-pink hover:underline mt-2"
                  >
                    Gerar novo desafio
                  </button>
                </div>
              )}

              {/* Esqueceu senha */}
              <div className="text-right">
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-neon-pink hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>

              {/* Botao submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner w-5 h-5 mr-2" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-dark-800 text-gray-500">ou continue com</span>
              </div>
            </div>

            {/* Login social */}
            <div className="space-y-3">
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
            </div>
          </div>

          {/* Link para registro */}
          <p className="text-center mt-6 text-gray-400">
            Nao tem conta?{' '}
            <Link href="/registro" className="text-neon-pink hover:underline font-medium">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {showForgotPassword && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm"
          onClick={closeForgotModal}
        >
          <div 
            className="bg-dark-800 border border-dark-600 rounded-2xl p-6 max-w-md w-full mx-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {forgotSuccess ? (
              // Sucesso
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-green/20 flex items-center justify-center">
                  <Mail size={32} className="text-neon-green" />
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-2">
                  Email Enviado!
                </h3>
                <p className="text-gray-400 mb-6">
                  Se o email <span className="text-neon-pink">{forgotEmail}</span> estiver cadastrado, 
                  você receberá um link para redefinir sua senha.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Verifique sua caixa de entrada e a pasta de spam.
                </p>
                <button
                  onClick={closeForgotModal}
                  className="btn-primary w-full"
                >
                  Entendi
                </button>
              </div>
            ) : (
              // Formulário
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-pink/20 flex items-center justify-center">
                    <Lock size={32} className="text-neon-pink" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mb-2">
                    Esqueceu a senha?
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Digite seu email e enviaremos um link para redefinir sua senha.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {forgotError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                      <AlertCircle size={18} />
                      {forgotError}
                    </div>
                  )}

                  <div>
                    <label className="input-label">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="input-field pl-12"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="btn-ghost flex-1"
                      disabled={forgotLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="btn-primary flex-1"
                    >
                      {forgotLoading ? (
                        <>
                          <span className="loading-spinner w-5 h-5 mr-2" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar Link'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

