'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWalletStore } from '@/store/walletStore';
import { useToast } from '@/contexts/ToastContext';
import {
  Zap,
  Flame,
  Clock,
  Wallet,
  CreditCard,
  QrCode,
  Loader2,
  X,
  Plus,
  Minus,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Crown,
} from 'lucide-react';

interface BoostOption {
  type: string;
  price: number;
  priceFormatted: string;
  durationHours: number;
  durationFormatted: string;
}

interface BoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  currentBoosts: number;
  onSuccess?: () => void;
}

export default function BoostModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  currentBoosts,
  onSuccess,
}: BoostModalProps) {
  const { wallet, fetchBalance } = useWalletStore();
  const { showToast } = useToast();

  // Estados
  const [boostOptions, setBoostOptions] = useState<BoostOption[]>([]);
  const [selectedType, setSelectedType] = useState<string>('12h');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'pix' | 'credit_card'>('wallet');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [step, setStep] = useState<'select' | 'payment' | 'pix'>('select');
  const [premiumDiscount, setPremiumDiscount] = useState(0);
  const [hasPremium, setHasPremium] = useState(false);

  // Busca configurações de preço
  useEffect(() => {
    if (isOpen) {
      fetchBoostConfig();
      fetchBalance();
      fetchPremiumDiscount();
    }
  }, [isOpen]);

  const fetchBoostConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await fetch('/api/boost/config');
      const data = await response.json();
      if (data.success) {
        setBoostOptions(data.data.boosts);
      }
    } catch (error) {
      console.error('Erro ao buscar config:', error);
      // Fallback
      setBoostOptions([
        { type: '12h', price: 0.20, priceFormatted: 'R$ 0,20', durationHours: 12, durationFormatted: '12 horas' },
        { type: '24h', price: 0.40, priceFormatted: 'R$ 0,40', durationHours: 24, durationFormatted: '24 horas' },
      ]);
    } finally {
      setIsLoadingConfig(false);
    }
  };

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

  const fetchPremiumDiscount = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/premium/discount', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success && data.data.hasPremium) {
        setPremiumDiscount(data.data.discountPercent);
        setHasPremium(true);
      } else {
        setPremiumDiscount(0);
        setHasPremium(false);
      }
    } catch (error) {
      console.error('Erro ao buscar desconto premium:', error);
      setPremiumDiscount(0);
      setHasPremium(false);
    }
  };

  const selectedOption = boostOptions.find(o => o.type === selectedType);
  const basePrice = selectedOption ? selectedOption.price * quantity : 0;
  const discountAmount = basePrice * (premiumDiscount / 100);
  const totalPrice = basePrice - discountAmount;
  const walletBalance = wallet?.balance || 0;
  const hasEnoughBalance = walletBalance >= totalPrice;

  const handleBuyBoost = async () => {
    const token = getAuthToken();
    if (!token) {
      showToast('Você precisa estar logado', 'error');
      return;
    }

    // Se não tem saldo e escolheu carteira, muda para step de pagamento
    if (paymentMethod === 'wallet' && !hasEnoughBalance) {
      setStep('payment');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/boost/buy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          boostType: selectedType,
          paymentMethod,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'INSUFFICIENT_BALANCE') {
          setStep('payment');
          return;
        }
        throw new Error(data.error || 'Erro ao comprar boost');
      }

      showToast(`🔥 ${quantity} boost(s) aplicado(s) com sucesso!`, 'success');
      fetchBalance(); // Atualiza saldo
      onSuccess?.();
      onClose();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPaymentMethod = (method: 'pix' | 'credit_card') => {
    setPaymentMethod(method);
    if (method === 'pix') {
      setStep('pix');
    } else {
      // Para cartão, processa direto (simulado)
      handleBuyBoost();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Estado para verificar se estamos no cliente
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // Usa portal para renderizar fora da hierarquia do componente pai
  return createPortal(
    <div 
      className="fixed inset-0 bg-dark-950/95 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up border border-dark-600 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-500/20 via-yellow-500/20 to-red-500/20 p-6 border-b-2 border-dark-600">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-3 hover:bg-dark-700 rounded-lg transition-colors"
            aria-label="Fechar modal"
          >
            <X size={24} className="text-white" />
          </button>
          
          <div className="flex items-center gap-4 pr-12">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Flame size={32} className="text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-2xl text-white mb-1">
                Dar Boost
              </h3>
              <p className="text-gray-300 text-base font-medium truncate max-w-[250px]">
                {eventName}
              </p>
            </div>
          </div>

          {/* Boosts atuais */}
          <div className="mt-4 flex items-center gap-3 text-base">
            <Sparkles size={20} className="text-yellow-400" />
            <span className="text-gray-200 font-medium">
              Este evento tem <span className="text-yellow-400 font-bold text-lg">{currentBoosts}</span> boost(s) ativos
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoadingConfig ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-neon-pink" />
            </div>
          ) : step === 'select' ? (
            <>
              {/* Opções de Boost */}
              <div className="mb-8">
                <label className="block text-lg font-semibold text-white mb-4">Escolha a duração</label>
                <div className="grid grid-cols-2 gap-4">
                  {boostOptions.map((option) => (
                    <button
                      key={option.type}
                      onClick={() => setSelectedType(option.type)}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        selectedType === option.type
                          ? 'border-orange-500 bg-orange-500/20 shadow-lg shadow-orange-500/20'
                          : 'border-dark-600 bg-dark-700 hover:border-orange-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Clock size={24} className={selectedType === option.type ? 'text-orange-400' : 'text-gray-400'} />
                        <span className={`text-lg font-bold ${selectedType === option.type ? 'text-white' : 'text-gray-300'}`}>
                          {option.durationFormatted}
                        </span>
                      </div>
                      <div className={`flex items-baseline gap-1 mb-1 ${
                        selectedType === option.type ? 'text-orange-400' : 'text-gray-400'
                      }`}>
                        <span className="text-xl font-display font-bold">R$</span>
                        <span className="text-3xl font-display font-bold">
                          {option.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">por boost</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantidade */}
              <div className="mb-8">
                <label className="block text-lg font-semibold text-white mb-4">Quantidade de boosts</label>
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center rounded-xl overflow-hidden border-2 border-orange-500 focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 focus-within:ring-offset-dark-800">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="h-16 w-16 bg-dark-700 flex items-center justify-center hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-r-2 border-orange-500/50"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus size={28} className="text-white" />
                    </button>
                    <div 
                      className="h-16 bg-dark-700 flex items-center justify-center px-4"
                      style={{
                        minWidth: `${Math.max(8, quantity.toString().length + 2)}rem`,
                        width: 'auto'
                      }}
                    >
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value && value >= 1) {
                            setQuantity(value);
                          } else if (e.target.value === '') {
                            setQuantity(1);
                          }
                        }}
                        onBlur={(e) => {
                          if (!e.target.value || parseInt(e.target.value) < 1) {
                            setQuantity(1);
                          }
                        }}
                        className="w-full h-full text-center font-display font-bold text-white bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ 
                          fontSize: quantity.toString().length <= 2 ? '3rem' : 
                                   quantity.toString().length <= 3 ? '2.5rem' : 
                                   quantity.toString().length <= 4 ? '2rem' : 
                                   quantity.toString().length <= 5 ? '1.75rem' : '1.5rem'
                        }}
                        aria-label="Quantidade de boosts"
                      />
                    </div>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-16 w-16 bg-dark-700 flex items-center justify-center hover:bg-dark-600 transition-all border-l-2 border-orange-500/50"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus size={28} className="text-white" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-center gap-3">
                  {[1, 5, 10, 25].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuantity(n)}
                      className={`px-6 py-3 rounded-xl text-lg font-semibold transition-all ${
                        quantity === n
                          ? 'bg-orange-500 border-2 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                          : 'bg-dark-700 border-2 border-dark-600 text-gray-300 hover:border-orange-500/50 hover:text-white'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-dark-700/50 rounded-xl p-6 mb-6 border-2 border-dark-600">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg text-gray-300">Subtotal</span>
                  <span className="text-lg font-semibold text-white">
                    {selectedOption?.priceFormatted} × {quantity}
                  </span>
                </div>
                {hasPremium && premiumDiscount > 0 && (
                  <div className="flex items-center justify-between mb-3 pt-3 border-t border-dark-600">
                    <div className="flex items-center gap-2">
                      <Crown size={20} className="text-yellow-400" />
                      <span className="text-lg text-yellow-400 font-semibold">
                        Desconto Premium ({premiumDiscount}%)
                      </span>
                    </div>
                    <span className="text-lg font-bold text-yellow-400">
                      -{formatCurrency(discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t-2 border-dark-600">
                  <span className="text-xl font-bold text-white">Total</span>
                  <div className="text-right">
                    {hasPremium && premiumDiscount > 0 && (
                      <span className="text-sm text-gray-400 line-through block mb-1">
                        {formatCurrency(basePrice)}
                      </span>
                    )}
                    <span className="text-4xl font-display font-bold text-orange-400">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </div>
                {hasPremium && premiumDiscount > 0 && (
                  <div className="mt-3 pt-3 border-t border-dark-600">
                    <p className="text-sm text-yellow-400 font-medium text-center">
                      💰 Você está economizando {formatCurrency(discountAmount)} com Premium!
                    </p>
                  </div>
                )}
              </div>

              {/* Saldo da carteira */}
              <div className={`rounded-xl p-6 mb-6 border-2 ${
                hasEnoughBalance 
                  ? 'bg-neon-green/10 border-neon-green/50' 
                  : 'bg-yellow-500/10 border-yellow-500/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Wallet size={24} className={hasEnoughBalance ? 'text-neon-green' : 'text-yellow-400'} />
                    <span className="text-lg font-semibold text-white">Saldo na carteira</span>
                  </div>
                  <span className={`text-2xl font-bold ${hasEnoughBalance ? 'text-neon-green' : 'text-yellow-400'}`}>
                    {formatCurrency(walletBalance)}
                  </span>
                </div>
                {!hasEnoughBalance && (
                  <p className="text-base text-yellow-400 mt-3 font-medium">
                    Saldo insuficiente. Você pode pagar via PIX ou Cartão.
                  </p>
                )}
              </div>

              {/* Botão de comprar */}
              <button
                onClick={handleBuyBoost}
                disabled={isLoading}
                className="w-full py-5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Flame size={24} />
                    <span>{hasEnoughBalance ? 'Dar Boost com Carteira' : 'Escolher forma de pagamento'}</span>
                  </>
                )}
              </button>
            </>
          ) : step === 'payment' ? (
            <>
              {/* Escolha de pagamento alternativo */}
              <div className="text-center mb-8">
                <AlertCircle size={64} className="mx-auto mb-5 text-yellow-400" />
                <h4 className="font-bold text-white text-2xl mb-3">Saldo Insuficiente</h4>
                <p className="text-lg text-gray-300">
                  Você precisa de <span className="text-orange-400 font-bold text-xl">{formatCurrency(totalPrice)}</span> mas tem apenas <span className="text-yellow-400 font-bold text-xl">{formatCurrency(walletBalance)}</span>
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <button
                  onClick={() => handleSelectPaymentMethod('pix')}
                  className="w-full p-6 bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-neon-green rounded-xl transition-all flex items-center gap-5"
                >
                  <div className="w-16 h-16 rounded-xl bg-neon-green/20 flex items-center justify-center">
                    <QrCode size={32} className="text-neon-green" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-white text-lg mb-1">Pagar com PIX</p>
                    <p className="text-base text-gray-300">Aprovação instantânea</p>
                  </div>
                  <span className="text-neon-green font-bold text-xl">{formatCurrency(totalPrice)}</span>
                </button>

                <button
                  onClick={() => handleSelectPaymentMethod('credit_card')}
                  disabled={isLoading}
                  className="w-full p-6 bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-neon-blue rounded-xl transition-all flex items-center gap-5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-16 h-16 rounded-xl bg-neon-blue/20 flex items-center justify-center">
                    <CreditCard size={32} className="text-neon-blue" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-white text-lg mb-1">Pagar com Cartão</p>
                    <p className="text-base text-gray-300">Crédito ou débito</p>
                  </div>
                  <span className="text-neon-blue font-bold text-xl">{formatCurrency(totalPrice)}</span>
                </button>
              </div>

              <button
                onClick={() => setStep('select')}
                className="w-full py-4 text-lg font-semibold btn-ghost"
              >
                Voltar
              </button>
            </>
          ) : step === 'pix' ? (
            <>
              {/* Tela de pagamento PIX */}
              <div className="text-center mb-8">
                <div className="w-64 h-64 mx-auto bg-white rounded-xl p-6 flex items-center justify-center mb-6 shadow-lg">
                  <QrCode size={180} className="text-dark-900" />
                </div>
                <p className="text-lg text-gray-300 mb-4 font-medium">
                  Escaneie o QR Code ou copie o código PIX
                </p>
                <div className="bg-dark-700 rounded-lg p-4 border-2 border-dark-600">
                  <code className="text-base text-gray-300 break-all font-mono">
                    00020126360014BR.GOV.BCB.PIX...{eventId.slice(0, 8)}
                  </code>
                </div>
              </div>

              <div className="bg-orange-500/10 border-2 border-orange-500/50 rounded-xl p-6 mb-6">
                <p className="text-lg text-orange-400 mb-2">
                  Valor: <span className="font-bold text-2xl">{formatCurrency(totalPrice)}</span>
                </p>
                <p className="text-base text-gray-300 mt-2">
                  Após o pagamento, o boost será aplicado automaticamente.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('payment')}
                  className="btn-ghost flex-1 py-4 text-lg font-semibold"
                >
                  Voltar
                </button>
                <button
                  onClick={handleBuyBoost}
                  disabled={isLoading}
                  className="btn-primary flex-1 py-4 text-lg font-bold bg-neon-green hover:bg-neon-green/80"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={24} className="animate-spin mr-2" />
                      Verificando...
                    </>
                  ) : (
                    'Já paguei'
                  )}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

