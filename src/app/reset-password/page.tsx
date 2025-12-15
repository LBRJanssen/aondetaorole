'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/UI/ToastContainer';
import { getErrorMessage } from '@/utils/errorMessages';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Verifica se há parâmetros de erro na URL (quando o link expira ou é inválido)
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');
    
    // Verifica também no hash (alguns erros vêm no hash)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.substring(1));
    const hashError = hashParams.get('error');
    const hashErrorDescription = hashParams.get('error_description');
    
    if (errorParam || hashError) {
      const errorMessage = (errorDescription || hashErrorDescription)
        ? decodeURIComponent((errorDescription || hashErrorDescription).replace(/\+/g, ' '))
        : 'Link inválido ou expirado. Solicite um novo link de redefinição de senha.';
      
      setError(errorMessage);
      setIsValidating(false);
      return;
    }

    // Processa o hash do Supabase (token vem no hash)
    const processHash = async () => {
      try {
        // Verifica se Supabase está configurado
        if (!supabase) {
          console.error('❌ [Reset Password] Supabase não configurado');
          setError('Serviço temporariamente indisponível');
          setIsValidating(false);
          return;
        }

        // Listener para mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔐 [Reset Password] Auth state changed:', event, session ? 'Session exists' : 'No session');
          
          if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
            if (session) {
              console.log('✅ [Reset Password] Session válida, permitindo redefinição');
              setIsValidating(false);
            }
          }
        });

        // Aguarda um pouco para o Supabase processar o hash automaticamente
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verifica se há uma sessão válida após o processamento do hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [Reset Password] Erro ao verificar sessão:', sessionError);
          setError('Erro ao validar o link. Tente novamente.');
          setIsValidating(false);
          subscription.unsubscribe();
          return;
        }

        if (session) {
          console.log('✅ [Reset Password] Sessão encontrada, link válido');
          setIsValidating(false);
          subscription.unsubscribe();
          return;
        }

        // Se não há sessão, verifica se há hash
        if (!hash || !hash.includes('access_token')) {
          setError('Link inválido. Solicite um novo link de redefinição de senha.');
          setIsValidating(false);
          subscription.unsubscribe();
          return;
        }
        
        // Aguarda mais um pouco caso o Supabase ainda esteja processando
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
        
        if (retryError) {
          console.error('❌ [Reset Password] Erro ao verificar sessão (retry):', retryError);
          setError('Erro ao processar o link. Tente novamente.');
          setIsValidating(false);
          subscription.unsubscribe();
          return;
        }
        
        if (!retrySession) {
          setError('Link inválido ou expirado. O link pode ter expirado ou já foi usado. Solicite um novo link de redefinição de senha.');
          setIsValidating(false);
          subscription.unsubscribe();
          return;
        }

        // Link válido, pode prosseguir
        setIsValidating(false);
        subscription.unsubscribe();
      } catch (err: any) {
        console.error('❌ [Reset Password] Erro ao processar link:', err);
        setError('Erro ao validar o link. Tente novamente.');
        setIsValidating(false);
      }
    };

    processHash();
  }, [searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return 'A senha deve ter no mínimo 6 caracteres';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'A senha deve conter pelo menos uma letra maiúscula';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'A senha deve conter pelo menos uma letra minúscula';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'A senha deve conter pelo menos um número';
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      return 'A senha deve conter pelo menos um caractere especial';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (!password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      // Verifica se Supabase está configurado
      if (!supabase) {
        setError('Serviço temporariamente indisponível');
        setIsLoading(false);
        return;
      }

      // Atualiza a senha usando o Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError);
        setError(getErrorMessage(updateError));
        return;
      }

      setSuccess(true);
      showToast('Senha redefinida com sucesso!', 'success');

      // Redireciona para login após 10 segundos
      setTimeout(() => {
        router.push('/login');
      }, 10000);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
      setError('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neon-pink/20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-neon-pink border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="font-display font-bold text-xl text-white mb-2">
            Validando Link
          </h2>
          <p className="text-gray-400 text-sm">
            Aguarde enquanto verificamos seu link de recuperação...
          </p>
        </div>
      </div>
    );
  }

  if (error && !success) {
    const isExpired = error.toLowerCase().includes('expirado') || error.toLowerCase().includes('expired');
    const isSamePassword = error.toLowerCase().includes('diferente') || error.toLowerCase().includes('different');
    
    // Traduz a mensagem se ainda estiver em inglês
    let displayError = error;
    if (error.includes('New password should be different from the old password')) {
      displayError = 'A nova senha deve ser diferente da senha atual.';
    } else if (error.includes('expired')) {
      displayError = 'O link expirou. Solicite um novo link de recuperação.';
    } else if (error.includes('invalid')) {
      displayError = 'Link inválido. Solicite um novo link de recuperação.';
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
        <div className="max-w-md w-full">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8 text-center shadow-2xl">
            {/* Ícone */}
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
              isSamePassword ? 'bg-yellow-500/20' : 'bg-red-500/20'
            }`}>
              <AlertCircle size={40} className={isSamePassword ? 'text-yellow-400' : 'text-red-400'} />
            </div>
            
            {/* Título */}
            <h1 className="font-display font-bold text-2xl text-white mb-3">
              {isSamePassword ? 'Senha Repetida' : isExpired ? 'Link Expirado' : 'Link Inválido'}
            </h1>
            
            {/* Mensagem */}
            <p className="text-gray-400 mb-6 leading-relaxed">{displayError}</p>
            
            {/* Dica para senha repetida */}
            {isSamePassword && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-yellow-400">
                  💡 <strong>Dica:</strong> Por segurança, você não pode usar a mesma senha anterior. 
                  Escolha uma senha nova e diferente.
                </p>
              </div>
            )}
            
            {/* Dica para link expirado */}
            {isExpired && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-400">
                  ⏰ <strong>Por segurança:</strong> Os links de recuperação expiram em 1 hora. 
                  Solicite um novo link na página de login.
                </p>
              </div>
            )}
            
            {/* Botões */}
            <div className="space-y-3">
              <Link
                href="/login"
                className="btn-primary w-full text-center block py-3"
              >
                {isSamePassword ? 'Tentar Novamente' : 'Solicitar Novo Link'}
              </Link>
              
              <Link
                href="/home"
                className="btn-ghost w-full text-center block"
              >
                Voltar ao Início
              </Link>
            </div>
            
            {/* Texto de ajuda */}
            <p className="text-xs text-gray-500 mt-6">
              Precisa de ajuda? Entre em contato pelo suporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
        <div className="max-w-md w-full">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8 text-center shadow-2xl">
            {/* Animação de sucesso */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neon-green/20 flex items-center justify-center animate-pulse">
              <CheckCircle size={40} className="text-neon-green" />
            </div>
            
            <h1 className="font-display font-bold text-2xl text-white mb-3">
              Senha Alterada! 🎉
            </h1>
            
            <p className="text-gray-400 mb-2 leading-relaxed">
              Sua senha foi redefinida com sucesso!
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Redirecionando para o login em 10 segundos...
            </p>
            
            {/* Barra de progresso */}
            <div className="w-full h-2 bg-dark-600 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-gradient-to-r from-neon-pink to-neon-purple rounded-full" 
                   style={{ animation: 'progress 10s linear forwards' }} />
            </div>
            
            <Link
              href="/login"
              className="btn-primary w-full text-center block py-3"
            >
              Ir para Login Agora
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 flex items-center justify-center">
              <Lock size={36} className="text-neon-pink" />
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-2">
              Nova Senha
            </h1>
            <p className="text-gray-400">
              Crie uma senha forte e segura
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nova Senha */}
            <div>
              <label className="input-label mb-2 block">
                Nova Senha
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                  <Lock size={20} className="text-gray-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="input-field pl-12 pr-12 w-full"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 6 caracteres, com maiúscula, minúscula, número e caractere especial
              </p>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="input-label mb-2 block">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                  <Lock size={20} className="text-gray-500" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="input-field pl-12 pr-12 w-full"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-gray-500 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Botão Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redefinindo...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Redefinir Senha
                </>
              )}
            </button>

            {/* Link para Login */}
            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-neon-pink transition-colors"
              >
                Voltar para Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ToastWrapper() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export default function ResetPasswordPage() {
  return (
    <ToastProvider>
      <ResetPasswordContent />
      <ToastWrapper />
    </ToastProvider>
  );
}

