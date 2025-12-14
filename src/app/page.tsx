'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Página raiz que intercepta tokens de recovery do Supabase
export default function RootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Verifica se há token de recovery na URL (quando Supabase redireciona para raiz)
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const hash = typeof window !== 'undefined' ? window.location.hash : '';

    // Se for recovery token, redireciona para /reset-password
    if (type === 'recovery' && token) {
      console.log('🔗 [Root] Token de recovery detectado, redirecionando para /reset-password');
      router.replace(`/reset-password#access_token=${token}&type=recovery`);
      return;
    }

    // Verifica se há token no hash (caso o Supabase coloque no hash)
    if (hash.includes('access_token') && hash.includes('type=recovery')) {
      console.log('🔗 [Root] Token de recovery no hash, redirecionando para /reset-password');
      router.replace(`/reset-password${hash}`);
      return;
    }

    // Se não há token de recovery, redireciona normalmente para /home
    router.replace('/home');
  }, [router, searchParams]);

  // Mostra loading enquanto processa
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-neon-pink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}

