'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Phone } from 'lucide-react';
import { validatePhone, applyPhoneMask, sanitizeInput } from '@/utils/validation';
import { checkRateLimit, recordFailedAttempt, recordSuccess } from '@/utils/rateLimiter';
import { generateCaptcha, validateCaptcha } from '@/utils/captcha';
import { debugAuth, debugUI, debugForm, debugNavigation } from '@/utils/debug';

export default function RegistroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/home';
  const { register, isAuthenticated, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitError, setRateLimitError] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswerValue, setCaptchaAnswerValue] = useState('');

  // Log de montagem da página
  useEffect(() => {
    debugUI.pageLoad('Registro');
  }, []);

  // Redireciona se ja estiver logado
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      debugNavigation.redirect('Usuário já autenticado', redirect);
      // Preserva parâmetros de query na URL de redirecionamento
      try {
        const redirectUrl = new URL(redirect, window.location.origin);
        const currentParams = new URLSearchParams(window.location.search);
        
        currentParams.forEach((value, key) => {
          if (key !== 'redirect') {
            redirectUrl.searchParams.set(key, value);
          }
        });
        
        const finalRedirect = redirectUrl.pathname + redirectUrl.search;
        router.push(finalRedirect);
      } catch {
        router.push(redirect);
      }
    }
  }, [isAuthenticated, router, redirect]);

  // Gera CAPTCHA inicial
  useEffect(() => {
    const captcha = generateCaptcha();
    setCaptchaQuestion(captcha.question);
    setShowCaptcha(true);
  }, []);

  // Validacao de senha (requisitos do Supabase)
  const passwordChecks = {
    length: password.length >= 6,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?/~`]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const isPasswordValid = passwordChecks.length && 
                          passwordChecks.hasLowercase && 
                          passwordChecks.hasUppercase && 
                          passwordChecks.hasNumber && 
                          passwordChecks.hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    debugUI.formSubmit('Registro');
    setError('');
    setRateLimitError('');

    if (!name || !email || !phone || !password || !confirmPassword) {
      debugForm.validation('campos', false, 'Campos obrigatórios vazios');
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    // Verifica rate limiting
    const rateLimit = checkRateLimit('register');
    if (!rateLimit.allowed) {
      debugAuth.registerError({ message: 'Rate limit excedido' });
      setRateLimitError(rateLimit.error || 'Muitas tentativas. Tente novamente mais tarde.');
      return;
    }

    // Valida CAPTCHA
    if (!captchaAnswerValue.trim()) {
      debugForm.validation('captcha', false, 'CAPTCHA vazio');
      setError('Resolva o desafio matemático');
      return;
    }
    
    if (!validateCaptcha(captchaAnswerValue)) {
      debugForm.validation('captcha', false, 'Resposta incorreta');
      setError('Resposta incorreta. Tente novamente.');
      const captcha = generateCaptcha();
      setCaptchaQuestion(captcha.question);
      setCaptchaAnswerValue('');
      return;
    }
    debugForm.validation('captcha', true);

    // Validação de telefone (mais rigorosa)
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      debugForm.validation('phone', false, phoneValidation.error);
      setError(phoneValidation.error || 'Telefone inválido');
      recordFailedAttempt('register');
      return;
    }
    debugForm.validation('phone', true);

    // Log de validação de senha
    debugAuth.passwordValidation(passwordChecks);

    if (!passwordChecks.length) {
      debugForm.validation('password', false, 'Senha muito curta');
      setError('A senha deve ter no minimo 6 caracteres');
      return;
    }

    if (!passwordChecks.hasLowercase) {
      debugForm.validation('password', false, 'Falta letra minúscula');
      setError('A senha deve conter pelo menos uma letra minúscula');
      return;
    }

    if (!passwordChecks.hasUppercase) {
      debugForm.validation('password', false, 'Falta letra maiúscula');
      setError('A senha deve conter pelo menos uma letra maiúscula');
      return;
    }

    if (!passwordChecks.hasNumber) {
      debugForm.validation('password', false, 'Falta número');
      setError('A senha deve conter pelo menos um número');
      return;
    }

    if (!passwordChecks.hasSpecial) {
      debugForm.validation('password', false, 'Falta caractere especial');
      setError('A senha deve conter pelo menos um caractere especial (!@#$%^&*()_+-=[]{};\':"|<>?,./~`)');
      return;
    }

    if (!passwordChecks.match) {
      debugForm.validation('confirmPassword', false, 'Senhas não conferem');
      setError('As senhas nao conferem');
      return;
    }
    debugForm.validation('password', true);

    if (!acceptTerms) {
      debugForm.validation('terms', false, 'Termos não aceitos');
      setError('Voce precisa aceitar os termos de uso');
      return;
    }

    // Validação adicional de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      debugForm.validation('email', false, 'Formato inválido');
      setError('Formato de email inválido');
      return;
    }
    debugForm.validation('email', true);

    // Validação de nome
    if (name.trim().length < 2) {
      debugForm.validation('name', false, 'Nome muito curto');
      setError('Nome deve ter pelo menos 2 caracteres');
      return;
    }
    debugForm.validation('name', true);

    debugAuth.registerStart(cleanEmail);

    try {
      // Remove formatação do telefone antes de salvar
      const phoneClean = phone.replace(/\D/g, '');
      // Sanitiza os dados antes de enviar
      const sanitizedName = sanitizeInput(name.trim());
      
      console.log('📝 [Registro] Enviando dados para registro...', {
        email: cleanEmail.substring(0, 5) + '***',
        name: sanitizedName,
        hasPhone: !!phoneClean,
      });
      
      await register(cleanEmail, password, sanitizedName, phoneClean);
      
      // Registra sucesso
      recordSuccess('register');
      debugAuth.registerSuccess('', cleanEmail);
      
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
          debugNavigation.navigate('/registro', finalRedirect);
          router.push(finalRedirect);
        } catch {
          router.push(redirect);
        }
      } else {
        router.push(redirect);
      }
    } catch (err: any) {
      debugAuth.registerError(err);
      setError(err.message || 'Erro ao criar conta');
      recordFailedAttempt('register');
      
      // Gera novo CAPTCHA após erro
      const captcha = generateCaptcha();
      setCaptchaQuestion(captcha.question);
      setCaptchaAnswerValue('');
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12">
        <div className="w-full max-w-md mx-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-neon-pink to-neon-purple rounded-xl flex items-center justify-center">
              <UserPlus size={32} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-3xl text-white mb-2">
              Criar Conta
            </h1>
            <p className="text-gray-400">
              Junte-se a comunidade e descubra os melhores roles
            </p>
          </div>

          {/* Card do formulario */}
          <div className="card">
            {/* Erro */}
            {(error || rateLimitError) && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{rateLimitError || error}</p>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div>
                <label htmlFor="name" className="input-label">
                  Nome completo
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => {
                      // Permite espaços durante a digitação - sanitização apenas no submit
                      setName(e.target.value);
                    }}
                    placeholder="Seu nome"
                    className="input-field pl-10"
                    disabled={isLoading}
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="input-label">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      // Permite digitação normal - sanitização apenas no submit
                      setEmail(e.target.value);
                    }}
                    placeholder="seu@email.com"
                    className="input-field pl-10"
                    disabled={isLoading}
                    maxLength={255}
                  />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label htmlFor="phone" className="input-label">
                  Telefone *
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => {
                      // Remove tudo que não é número
                      let value = e.target.value.replace(/\D/g, '');
                      
                      // Limita a 11 dígitos (DDD + número)
                      if (value.length > 11) {
                        value = value.slice(0, 11);
                      }
                      
                      // Aplica máscara usando função de validação
                      const masked = applyPhoneMask(value);
                      setPhone(masked);
                    }}
                    placeholder="(11) 99999-9999"
                    className="input-field pl-10"
                    disabled={isLoading}
                    maxLength={15}
                  />
                </div>
                {phone && (() => {
                  const validation = validatePhone(phone);
                  return !validation.valid && validation.error ? (
                    <p className="text-xs text-red-400 mt-1">
                      {validation.error}
                    </p>
                  ) : null;
                })()}
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

                {/* Requisitos da senha */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className={`flex items-center gap-2 text-xs ${passwordChecks.length ? 'text-neon-green' : 'text-gray-500'}`}>
                      <CheckCircle size={14} />
                      <span>Mínimo 6 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasLowercase ? 'text-neon-green' : 'text-gray-500'}`}>
                      <CheckCircle size={14} />
                      <span>Contém letra minúscula</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasUppercase ? 'text-neon-green' : 'text-gray-500'}`}>
                      <CheckCircle size={14} />
                      <span>Contém letra maiúscula</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasNumber ? 'text-neon-green' : 'text-gray-500'}`}>
                      <CheckCircle size={14} />
                      <span>Contém número</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasSpecial ? 'text-neon-green' : 'text-gray-500'}`}>
                      <CheckCircle size={14} />
                      <span>Contém caractere especial</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar senha */}
              <div>
                <label htmlFor="confirmPassword" className="input-label">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    className="input-field pl-10"
                    disabled={isLoading}
                  />
                </div>
                {confirmPassword && (
                  <div className={`mt-2 flex items-center gap-2 text-xs ${passwordChecks.match ? 'text-neon-green' : 'text-red-400'}`}>
                    <CheckCircle size={14} />
                    <span>{passwordChecks.match ? 'Senhas conferem' : 'Senhas nao conferem'}</span>
                  </div>
                )}
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

              {/* Termos */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-dark-600 bg-dark-700 text-neon-pink focus:ring-neon-pink"
                />
                <label htmlFor="terms" className="text-sm text-gray-400 cursor-pointer">
                  Li e aceito os{' '}
                  <Link href="/termos" className="text-neon-pink hover:underline">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link href="/termos#privacidade" className="text-neon-pink hover:underline">
                    Politica de Privacidade
                  </Link>
                </label>
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
                    Criando conta...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </button>
            </form>
          </div>

          {/* Link para login */}
          <p className="text-center mt-6 text-gray-400">
            Ja tem conta?{' '}
            <Link href="/login" className="text-neon-pink hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}

