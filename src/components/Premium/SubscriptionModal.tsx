'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWalletStore } from '@/store/walletStore';
import { useToast } from '@/contexts/ToastContext';
import {
  X,
  Wallet,
  CreditCard,
  QrCode,
  Loader2,
  Crown,
  CheckCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  pricePerMonth: number;
  totalPrice: number;
  boostDiscountPercent: number;
  isPopular: boolean;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  onSuccess?: () => void;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  plan,
  onSuccess,
}: SubscriptionModalProps) {
  const { wallet, fetchBalance } = useWalletStore();
  const { showToast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'pix' | 'credit_card'>('wallet');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'method' | 'pix'>('method');

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            return parsed.access_token || null;
          }
        } catch {
          continue;
        }
      }
    }
    return null;
  };

  const walletBalance = wallet?.balance || 0;
  const hasEnoughBalance = walletBalance >= (plan?.totalPrice || 0);

  const handleSubscribe = async () => {
    if (!plan) return;

    const token = getAuthToken();
    if (!token) {
      showToast('Você precisa estar logado', 'error');
      return;
    }

    // Se não tem saldo e escolheu carteira, mostra erro
    if (paymentMethod === 'wallet' && !hasEnoughBalance) {
      showToast('Saldo insuficiente na carteira', 'error');
      return;
    }

    // Se escolheu PIX, vai para step de PIX
    if (paymentMethod === 'pix') {
      setStep('pix');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/premium/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: plan.name,
          paymentMethod,
          autoRenew: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'INSUFFICIENT_BALANCE') {
          showToast('Saldo insuficiente na carteira', 'error');
          return;
        }
        if (data.code === 'ALREADY_SUBSCRIBED') {
          showToast('Você já possui uma assinatura ativa', 'error');
          return;
        }
        throw new Error(data.error || 'Erro ao assinar premium');
      }

      showToast(`🎉 Assinatura ${plan.displayName} ativada com sucesso!`, 'success');
      fetchBalance();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !plan || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-dark-800 rounded-2xl border-2 border-dark-600 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
              <Crown size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                Confirmar Assinatura
              </h2>
              <p className="text-sm text-gray-400">{plan.displayName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
            disabled={isLoading}
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'method' ? (
            <>
              {/* Resumo do Plano */}
              <div className="bg-dark-700/50 rounded-xl p-6 mb-6 border border-dark-600">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg text-gray-300">Plano</span>
                  <span className="text-lg font-semibold text-white">
                    {plan.displayName}
                  </span>
                </div>
                {plan.boostDiscountPercent > 0 && (
                  <div className="flex items-center gap-2 mb-4 pt-4 border-t border-dark-600">
                    <Zap size={20} className="text-orange-400" />
                    <span className="text-sm text-orange-400 font-semibold">
                      {plan.boostDiscountPercent}% OFF em Boosts
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t-2 border-dark-600">
                  <span className="text-xl font-bold text-white">Total</span>
                  <span className="text-3xl font-display font-bold text-neon-pink">
                    {formatCurrency(plan.totalPrice)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {plan.pricePerMonth.toFixed(2).replace('.', ',')} por mês
                </p>
              </div>

              {/* Método de Pagamento */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Método de Pagamento
                </h3>
                <div className="space-y-3">
                  {/* Carteira */}
                  <button
                    onClick={() => setPaymentMethod('wallet')}
                    disabled={!hasEnoughBalance}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      paymentMethod === 'wallet'
                        ? 'border-neon-green bg-neon-green/10'
                        : 'border-dark-600 bg-dark-700/50 hover:border-dark-500'
                    } ${!hasEnoughBalance ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Wallet size={24} className="text-neon-green" />
                        <div>
                          <p className="font-semibold text-white">Carteira</p>
                          <p className="text-sm text-gray-400">
                            Saldo: {formatCurrency(walletBalance)}
                          </p>
                        </div>
                      </div>
                      {paymentMethod === 'wallet' && (
                        <CheckCircle size={20} className="text-neon-green" />
                      )}
                    </div>
                    {!hasEnoughBalance && (
                      <p className="text-xs text-red-400 mt-2">
                        Saldo insuficiente
                      </p>
                    )}
                  </button>

                  {/* PIX */}
                  <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      paymentMethod === 'pix'
                        ? 'border-neon-blue bg-neon-blue/10'
                        : 'border-dark-600 bg-dark-700/50 hover:border-dark-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <QrCode size={24} className="text-neon-blue" />
                        <div>
                          <p className="font-semibold text-white">PIX</p>
                          <p className="text-sm text-gray-400">
                            Aprovação instantânea
                          </p>
                        </div>
                      </div>
                      {paymentMethod === 'pix' && (
                        <CheckCircle size={20} className="text-neon-blue" />
                      )}
                    </div>
                  </button>

                  {/* Cartão de Crédito */}
                  <button
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      paymentMethod === 'credit_card'
                        ? 'border-neon-pink bg-neon-pink/10'
                        : 'border-dark-600 bg-dark-700/50 hover:border-dark-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard size={24} className="text-neon-pink" />
                        <div>
                          <p className="font-semibold text-white">Cartão de Crédito</p>
                          <p className="text-sm text-gray-400">
                            Parcelamento disponível
                          </p>
                        </div>
                      </div>
                      {paymentMethod === 'credit_card' && (
                        <CheckCircle size={20} className="text-neon-pink" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Botão Confirmar */}
              <button
                onClick={handleSubscribe}
                disabled={isLoading || (paymentMethod === 'wallet' && !hasEnoughBalance)}
                className="w-full py-4 px-6 bg-gradient-to-r from-neon-pink to-neon-purple hover:from-neon-pink/90 hover:to-neon-purple/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Crown size={20} />
                    Confirmar Assinatura
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <QrCode size={64} className="mx-auto mb-4 text-neon-blue" />
              <h3 className="text-xl font-bold text-white mb-2">
                Pagamento via PIX
              </h3>
              <p className="text-gray-400 mb-6">
                Em breve você poderá pagar via PIX
              </p>
              <button
                onClick={() => setStep('method')}
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

