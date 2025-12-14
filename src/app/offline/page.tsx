'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Icone */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-dark-700 flex items-center justify-center animate-pulse">
          <WifiOff size={48} className="text-gray-500" />
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-neon-pink to-neon-purple rounded-lg flex items-center justify-center">
            <span className="font-display font-bold text-white text-lg">R</span>
          </div>
          <span className="font-display font-bold text-xl text-white">
            AONDE TA O <span className="text-neon-pink">ROLE</span>
          </span>
        </div>

        {/* Mensagem */}
        <h1 className="font-display font-bold text-2xl text-white mb-4">
          Voce esta offline
        </h1>
        <p className="text-gray-400 mb-8">
          Parece que voce perdeu a conexao com a internet. 
          Verifique sua conexao e tente novamente.
        </p>

        {/* Botao de retry */}
        <button
          onClick={handleRetry}
          className="btn-primary inline-flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Tentar Novamente
        </button>

        {/* Info sobre PWA */}
        <p className="text-sm text-gray-500 mt-8">
          Algumas funcionalidades podem estar disponiveis offline quando voce ja tiver visitado a pagina antes.
        </p>
      </div>
    </div>
  );
}

