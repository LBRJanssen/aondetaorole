'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader, AlertCircle, CheckCircle, KeyRound, XCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('Processando...');

  useEffect(() => {
    const handleCallback = async () => {
      // Verifica se há erro na URL (fragment)
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        
        // Erros vêm no hash fragment
        if (hash.includes('error=')) {
          const params = new URLSearchParams(hash.substring(1));
          const error = params.get('error');
          const errorCode = params.get('error_code');
          const errorDescription = params.get('error_description')?.replace(/\+/g, ' ');

          console.log('❌ [AuthCallback] Erro detectado:', { error, errorCode, errorDescription });

          if (errorCode === 'otp_expired') {
            setStatus('expired');
            setMessage('O link expirou ou já foi utilizado.');
          } else {
            setStatus('error');
            setMessage(errorDescription || 'Erro ao processar autenticação');
          }
          return;
        }

        // Verifica se há tokens válidos
        if (hash.includes('access_token') || hash.includes('type=recovery')) {
          try {
            // Supabase processa automaticamente o hash
            const { data, error } = await supabase.auth.getSession();

            if (error) {
              console.error('❌ [AuthCallback] Erro ao obter sessão:', error);
              setStatus('error');
              setMessage('Erro ao verificar sessão');
              return;
            }

            if (data.session) {
              console.log('✅ [AuthCallback] Sessão válida encontrada');
              
              // Verifica se é recuperação de senha
              if (hash.includes('type=recovery')) {
                setStatus('success');
                setMessage('Link validado! Redirecionando...');
                setTimeout(() => {
                  router.push('/reset-password');
                }, 1500);
                return;
              }

              // Login normal
              setStatus('success');
              setMessage('Autenticado com sucesso!');
              setTimeout(() => {
                router.push('/home');
              }, 1500);
              return;
            }
          } catch (err) {
            console.error('❌ [AuthCallback] Erro:', err);
          }
        }
      }

      // Se não há tokens nem erros, redireciona para home
      console.log('🔄 [AuthCallback] Nenhum token ou erro, redirecionando...');
      router.push('/home');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-pink/20 flex items-center justify-center">
              <Loader size={32} className="text-neon-pink animate-spin" />
            </div>
            <h1 className="font-display font-bold text-xl text-white mb-2">
              Processando...
            </h1>
            <p className="text-gray-400">
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-green/20 flex items-center justify-center">
              <CheckCircle size={32} className="text-neon-green" />
            </div>
            <h1 className="font-display font-bold text-xl text-white mb-2">
              Sucesso!
            </h1>
            <p className="text-gray-400">
              {message}
            </p>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <KeyRound size={32} className="text-yellow-500" />
            </div>
            <h1 className="font-display font-bold text-xl text-white mb-2">
              Link Expirado
            </h1>
            <p className="text-gray-400 mb-6">
              {message}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Os links de recuperação de senha expiram após 1 hora por segurança.
            </p>
            <div className="space-y-3">
              <Link href="/login" className="btn-primary w-full block">
                Solicitar Novo Link
              </Link>
              <Link href="/home" className="btn-ghost w-full block">
                Voltar ao Início
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h1 className="font-display font-bold text-xl text-white mb-2">
              Erro
            </h1>
            <p className="text-gray-400 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <Link href="/login" className="btn-primary w-full block">
                Tentar Novamente
              </Link>
              <Link href="/home" className="btn-ghost w-full block">
                Voltar ao Início
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

