'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useWalletStore, Transaction } from '@/store/walletStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/contexts/ToastContext';
import {
  Wallet,
  Plus,
  Minus,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  QrCode,
  History,
  TrendingUp,
  TrendingDown,
  Zap,
  Crown,
  ShoppingCart,
  RotateCcw,
  Filter,
  ChevronDown,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// VALIDAÇÕES DE CHAVE PIX
// ============================================

// Valida CPF
function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

// Valida E-mail
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Valida Telefone (formato brasileiro)
function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  // Aceita 10 ou 11 dígitos (com ou sem 9 na frente)
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

// Formata CPF enquanto digita
function formatCPF(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 6) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3)}`;
  if (cleanValue.length <= 9) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6)}`;
  return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6, 9)}-${cleanValue.slice(9, 11)}`;
}

// Formata Telefone enquanto digita
function formatPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 2) return cleanValue;
  if (cleanValue.length <= 7) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
  if (cleanValue.length <= 11) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7)}`;
  return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7, 11)}`;
}

export default function CarteiraPage() {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { 
    wallet, 
    transactions, 
    pagination,
    isLoading, 
    isLoadingMore,
    error,
    filterType,
    fetchBalance, 
    fetchTransactions,
    deposit,
    withdraw,
    setFilterType
  } = useWalletStore();

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'email' | 'phone' | 'random'>('cpf');
  const [pixKeyError, setPixKeyError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Filter dropdown
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Carrega dados ao montar
  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchTransactions();
    }
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  };

  const generatePixCode = (value: number): string => {
    const randomCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return `00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540${value.toFixed(2)}5802BR5925AONDE TA O ROLE6009SAO PAULO62070503***6304${randomCode.substring(0, 4)}`;
  };

  const handleOpenDeposit = () => {
    setAmount('');
    setPaymentMethod('pix');
    setShowDepositModal(true);
  };

  const handleOpenWithdraw = () => {
    setAmount('');
    setPixKey('');
    setPixKeyType('cpf');
    setPixKeyError(null);
    setShowWithdrawModal(true);
  };

  // Quando muda o tipo de chave, limpa o campo e o erro
  const handlePixKeyTypeChange = (type: 'cpf' | 'email' | 'phone' | 'random') => {
    setPixKeyType(type);
    setPixKey('');
    setPixKeyError(null);
  };

  const handleConfirmDeposit = () => {
    const value = parseFloat(amount.replace(',', '.'));

    if (!value || value <= 0) {
      showToast('Valor inválido', 'error');
      return;
    }

    if (value < 10) {
      showToast('Valor mínimo de recarga é R$ 10,00', 'warning');
      return;
    }

    if (paymentMethod === 'pix') {
      const code = generatePixCode(value);
      setPixCode(code);
      setShowPaymentModal(true);
      setShowDepositModal(false);
    } else {
      setShowPaymentModal(true);
      setShowDepositModal(false);
    }
  };

  const handleProcessDeposit = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    setIsProcessing(true);

    try {
      const description = paymentMethod === 'pix' ? 'Depósito via PIX' : 'Depósito via Cartão';
      const result = await deposit(value, description);
      
      if (result.success) {
      setAmount('');
      setShowPaymentModal(false);
      setPixCode('');
        showToast('💰 Depósito realizado com sucesso!', 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error: any) {
      showToast('Erro ao realizar depósito: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Valida a chave PIX baseado no tipo
  const validatePixKey = (key: string, type: string): { valid: boolean; error: string | null } => {
    if (!key.trim()) {
      return { valid: false, error: 'Informe a chave PIX' };
    }

    switch (type) {
      case 'cpf':
        if (!isValidCPF(key)) {
          return { valid: false, error: 'CPF inválido. Verifique os números.' };
        }
        break;
      case 'email':
        if (!isValidEmail(key)) {
          return { valid: false, error: 'E-mail inválido. Verifique o formato.' };
        }
        break;
      case 'phone':
        if (!isValidPhone(key)) {
          return { valid: false, error: 'Telefone inválido. Use o formato (11) 99999-9999' };
        }
        break;
      case 'random':
        if (key.length < 10) {
          return { valid: false, error: 'Chave aleatória muito curta' };
        }
        break;
    }

    return { valid: true, error: null };
  };

  // Atualiza a chave PIX com formatação
  const handlePixKeyChange = (value: string) => {
    let formattedValue = value;
    
    if (pixKeyType === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (pixKeyType === 'phone') {
      formattedValue = formatPhone(value);
    }
    
    setPixKey(formattedValue);
    
    // Valida em tempo real (apenas mostra erro se tiver algo digitado)
    if (formattedValue.trim()) {
      const { error } = validatePixKey(formattedValue, pixKeyType);
      setPixKeyError(error);
    } else {
      setPixKeyError(null);
    }
  };

  const handleProcessWithdraw = async () => {
    const value = parseFloat(amount.replace(',', '.'));

    if (!value || value < 10) {
      showToast('Valor mínimo para saque é R$ 10,00', 'warning');
      return;
    }

    // Valida a chave PIX
    const { valid, error: pixError } = validatePixKey(pixKey, pixKeyType);
    if (!valid) {
      setPixKeyError(pixError);
      showToast(pixError || 'Chave PIX inválida', 'error');
      return;
    }

    if (wallet && value > wallet.balance) {
      showToast(`Saldo insuficiente! Você tem apenas ${formatCurrency(wallet.balance)} disponível.`, 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await withdraw(value, pixKey, pixKeyType);
      
      if (result.success) {
        setAmount('');
        setPixKey('');
        setPixKeyError(null);
        setShowWithdrawModal(false);
        showToast('💸 Saque solicitado! O valor será transferido em até 24h.', 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error: any) {
      showToast('Erro ao solicitar saque: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchTransactions(pagination.page + 1);
    }
  };

  const quickAmounts = [20, 50, 100, 200, 500];

  const filterOptions = [
    { value: null, label: 'Todos', icon: History },
    { value: 'deposit', label: 'Depósitos', icon: ArrowDownLeft },
    { value: 'withdraw', label: 'Saques', icon: ArrowUpRight },
    { value: 'purchase', label: 'Compras', icon: ShoppingCart },
    { value: 'boost', label: 'Boosts', icon: Zap },
    { value: 'premium', label: 'Premium', icon: Crown },
    { value: 'refund', label: 'Reembolsos', icon: RotateCcw },
  ];

  const currentFilter = filterOptions.find(f => f.value === filterType) || filterOptions[0];

  // Se não está logado
  if (!user) {
    return (
      <Layout>
        <div className="container-app py-8">
          <div className="card text-center py-16">
            <Wallet size={64} className="mx-auto mb-4 text-gray-500" />
            <h2 className="font-display font-bold text-2xl text-white mb-2">
              Faça login para acessar
            </h2>
            <p className="text-gray-400 mb-6">
              Você precisa estar logado para ver sua carteira
            </p>
            <a href="/login" className="btn-primary inline-flex items-center gap-2">
              Fazer Login
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-app py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl text-white mb-2">
            Carteira <span className="text-neon-pink">Digital</span>
          </h1>
          <p className="text-gray-400">Gerencie seu saldo, depósitos e saques</p>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Card de Saldo */}
        <div className="card-highlight mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Saldo Principal */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center flex-shrink-0 shadow-lg shadow-neon-green/20">
                <Wallet size={32} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-400 text-sm mb-1">Saldo Disponível</p>
                {isLoading ? (
                  <div className="h-10 w-40 bg-dark-700 animate-pulse rounded-lg" />
                ) : (
                  <p className="font-display font-bold text-3xl sm:text-4xl text-white">
                    {formatCurrency(wallet?.balance || 0)}
                </p>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
            <button
                onClick={handleOpenDeposit}
                className="btn-primary flex items-center justify-center gap-2 flex-1 lg:flex-none"
            >
              <Plus size={20} />
                <span>Depositar</span>
              </button>
              <button
                onClick={handleOpenWithdraw}
                className="btn-ghost flex items-center justify-center gap-2 flex-1 lg:flex-none border border-dark-600"
              >
                <Minus size={20} />
                <span>Sacar</span>
            </button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-dark-600">
            <div className="text-center p-3 bg-dark-700/50 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp size={16} className="text-neon-green" />
                <p className="text-xs text-gray-500">Total Depositado</p>
              </div>
              {isLoading ? (
                <div className="h-6 w-20 mx-auto bg-dark-600 animate-pulse rounded" />
              ) : (
                <p className="text-lg font-bold text-neon-green">
                  {formatCurrency(wallet?.totalDeposited || 0)}
                </p>
              )}
            </div>
            <div className="text-center p-3 bg-dark-700/50 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingDown size={16} className="text-red-400" />
                <p className="text-xs text-gray-500">Total Sacado</p>
              </div>
              {isLoading ? (
                <div className="h-6 w-20 mx-auto bg-dark-600 animate-pulse rounded" />
              ) : (
                <p className="text-lg font-bold text-red-400">
                  {formatCurrency(wallet?.totalWithdrawn || 0)}
                </p>
              )}
            </div>
            <div className="text-center p-3 bg-dark-700/50 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ArrowDownLeft size={16} className="text-neon-blue" />
                <p className="text-xs text-gray-500">Depósitos</p>
              </div>
              <p className="text-lg font-bold text-neon-blue">
                {transactions.filter(t => t.type === 'deposit').length}
              </p>
            </div>
            <div className="text-center p-3 bg-dark-700/50 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ShoppingCart size={16} className="text-neon-purple" />
                <p className="text-xs text-gray-500">Compras</p>
              </div>
              <p className="text-lg font-bold text-neon-purple">
                {transactions.filter(t => t.type === 'purchase').length}
              </p>
            </div>
          </div>
        </div>

        {/* Histórico de Transações */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
              <History size={24} className="text-neon-pink" />
              Histórico
            </h2>
            
            {/* Filtro */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg transition-colors"
              >
                <currentFilter.icon size={16} className="text-gray-400" />
                <span className="text-sm text-white">{currentFilter.label}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showFilterDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowFilterDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-dark-600 rounded-xl shadow-xl z-50 overflow-hidden">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value || 'all'}
                        onClick={() => {
                          setFilterType(option.value);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors ${
                          filterType === option.value ? 'bg-dark-700 text-neon-pink' : 'text-white'
                        }`}
                      >
                        <option.icon size={16} />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Loading */}
          {isLoading && transactions.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-dark-600" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-dark-600 rounded mb-2" />
                      <div className="h-3 w-24 bg-dark-600 rounded" />
                    </div>
                    <div className="h-6 w-20 bg-dark-600 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </div>

              {/* Carregar mais */}
              {pagination && pagination.hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <ChevronDown size={18} />
                        Carregar mais ({pagination.total - transactions.length} restantes)
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-12">
              <History size={48} className="mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">Nenhuma transação encontrada</p>
              <p className="text-sm text-gray-500 mt-2">
                {filterType ? 'Tente outro filtro ou ' : ''}
                Recarregue sua carteira para começar
              </p>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* MODAL DE DEPÓSITO */}
        {/* ============================================ */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-dark-950/90 z-[2000] flex items-center justify-center p-4" onClick={() => setShowDepositModal(false)}>
            <div
              className="bg-dark-800 rounded-2xl p-6 max-w-md w-full animate-slide-up border border-dark-600"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display font-bold text-xl text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-green/20 flex items-center justify-center">
                  <Plus size={20} className="text-neon-green" />
                </div>
                Depositar
              </h3>

              {/* Método de pagamento */}
              <div className="mb-6">
                <label className="input-label mb-3">Método de Pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'pix'
                        ? 'border-neon-green bg-neon-green/10'
                        : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                    }`}
                  >
                    <QrCode size={28} className={`mx-auto mb-2 ${paymentMethod === 'pix' ? 'text-neon-green' : 'text-gray-400'}`} />
                    <p className={`font-semibold ${paymentMethod === 'pix' ? 'text-white' : 'text-gray-400'}`}>PIX</p>
                    <p className="text-xs text-gray-500 mt-1">Instantâneo</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-neon-blue bg-neon-blue/10'
                        : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                    }`}
                  >
                    <CreditCard size={28} className={`mx-auto mb-2 ${paymentMethod === 'card' ? 'text-neon-blue' : 'text-gray-400'}`} />
                    <p className={`font-semibold ${paymentMethod === 'card' ? 'text-white' : 'text-gray-400'}`}>Cartão</p>
                    <p className="text-xs text-gray-500 mt-1">Até 2h</p>
                  </button>
                </div>
              </div>

              {/* Valor */}
              <div className="mb-6">
                <label className="input-label">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">R$</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d,]/g, '');
                      setAmount(value);
                    }}
                    placeholder="0,00"
                    className="input-field pl-12 text-2xl font-bold"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Mínimo: R$ 10,00</p>
              </div>

              {/* Valores rápidos */}
              <div className="mb-6">
                <label className="input-label mb-2">Valores Rápidos</label>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      onClick={() => setAmount(value.toFixed(2).replace('.', ','))}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        amount === value.toFixed(2).replace('.', ',')
                          ? 'bg-neon-pink/20 border-neon-pink text-white'
                          : 'bg-dark-700 border-dark-600 text-gray-300 hover:border-dark-500'
                      }`}
                    >
                      R$ {value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeposit}
                  className="btn-primary flex-1"
                  disabled={!amount || parseFloat(amount.replace(',', '.')) < 10}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MODAL DE PAGAMENTO PIX/CARTÃO */}
        {/* ============================================ */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-dark-950/90 z-[2100] flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
            <div
              className="bg-dark-800 rounded-2xl p-6 max-w-md w-full animate-slide-up border border-dark-600 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {paymentMethod === 'pix' ? (
                <>
                  <h3 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-green/20 flex items-center justify-center">
                      <QrCode size={20} className="text-neon-green" />
                    </div>
                    Pagar com PIX
                  </h3>

                  {/* Valor */}
                  <div className="mb-6 p-4 bg-gradient-to-br from-dark-700 to-dark-800 rounded-xl text-center border border-dark-600">
                    <p className="text-gray-400 text-sm mb-1">Valor a pagar</p>
                    <p className="font-display font-bold text-3xl text-white">
                      R$ {amount}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="mb-6 flex justify-center">
                    <div className="w-48 h-48 bg-white rounded-xl p-4 flex items-center justify-center">
                      <QrCode size={140} className="text-dark-900" />
                    </div>
                  </div>

                  {/* Código PIX */}
                  <div className="mb-6">
                    <label className="input-label mb-2">Código PIX Copia e Cola</label>
                    <div className="relative">
                      <textarea
                        value={pixCode}
                        readOnly
                        rows={3}
                        className="input-field font-mono text-xs resize-none pr-12"
                      />
                      <button
                        onClick={handleCopyPixCode}
                        className="absolute top-2 right-2 p-2 bg-dark-600 hover:bg-dark-500 rounded-lg transition-colors"
                        title="Copiar código"
                      >
                        {copied ? (
                          <Check size={18} className="text-neon-green" />
                        ) : (
                          <Copy size={18} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Instruções */}
                  <div className="mb-6 p-4 bg-neon-green/10 border border-neon-green/30 rounded-xl">
                    <p className="text-sm font-semibold text-neon-green mb-2">Instruções:</p>
                    <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Copie o código PIX ou escaneie o QR Code</li>
                      <li>Abra o app do seu banco</li>
                      <li>Confirme o pagamento</li>
                      <li>Clique em "Confirmar Pagamento" abaixo</li>
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-blue/20 flex items-center justify-center">
                      <CreditCard size={20} className="text-neon-blue" />
                    </div>
                    Pagar com Cartão
                  </h3>

                  {/* Valor */}
                  <div className="mb-6 p-4 bg-gradient-to-br from-dark-700 to-dark-800 rounded-xl text-center border border-dark-600">
                    <p className="text-gray-400 text-sm mb-1">Valor a pagar</p>
                    <p className="font-display font-bold text-3xl text-white">
                      R$ {amount}
                    </p>
                  </div>

                  {/* Formulário */}
                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="input-label">Número do Cartão</label>
                      <input
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        className="input-field"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">Validade</label>
                        <input
                          type="text"
                          placeholder="MM/AA"
                          maxLength={5}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="input-label">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          maxLength={4}
                          className="input-field"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Nome no Cartão</label>
                      <input
                        type="text"
                        placeholder="NOME COMPLETO"
                        className="input-field uppercase"
                      />
                    </div>
                  </div>

                  <div className="mb-6 p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-xl">
                    <p className="text-xs text-gray-400">
                      ⚡ Pagamento seguro. Aprovação pode levar até 2 horas.
                    </p>
                  </div>
                </>
              )}

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowDepositModal(true);
                  }}
                  className="btn-ghost flex-1"
                  disabled={isProcessing}
                >
                  Voltar
                </button>
                <button
                  onClick={handleProcessDeposit}
                  className="btn-primary flex-1"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Pagamento'
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                🔒 Sistema de pagamento simulado
              </p>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MODAL DE SAQUE */}
        {/* ============================================ */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-dark-950/90 z-[2000] flex items-center justify-center p-4" onClick={() => setShowWithdrawModal(false)}>
            <div
              className="bg-dark-800 rounded-2xl p-6 max-w-md w-full animate-slide-up border border-dark-600"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display font-bold text-xl text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Minus size={20} className="text-red-400" />
                </div>
                Sacar via PIX
              </h3>

              {/* Saldo disponível */}
              <div className="mb-6 p-4 bg-dark-700/50 rounded-xl border border-dark-600">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Saldo disponível:</span>
                  <span className="font-bold text-white text-lg">
                    {formatCurrency(wallet?.balance || 0)}
                  </span>
                </div>
              </div>

              {/* Valor */}
              <div className="mb-4">
                <label className="input-label">Valor do Saque</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">R$</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d,]/g, '');
                      setAmount(value);
                    }}
                    placeholder="0,00"
                    className="input-field pl-12 text-2xl font-bold"
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">Mínimo: R$ 10,00</p>
                  <button
                    onClick={() => setAmount((wallet?.balance || 0).toFixed(2).replace('.', ','))}
                    className="text-xs text-neon-pink hover:underline"
                  >
                    Sacar tudo
                  </button>
                </div>
          </div>

              {/* Tipo de chave */}
              <div className="mb-4">
                <label className="input-label">Tipo de Chave PIX</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'cpf', label: 'CPF' },
                    { value: 'email', label: 'E-mail' },
                    { value: 'phone', label: 'Celular' },
                    { value: 'random', label: 'Aleatória' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => handlePixKeyTypeChange(type.value as any)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                        pixKeyType === type.value
                          ? 'bg-neon-pink/20 border border-neon-pink text-white'
                          : 'bg-dark-700 border border-dark-600 text-gray-400 hover:border-dark-500'
                      }`}
                    >
                      {type.label}
                    </button>
              ))}
            </div>
              </div>

              {/* Chave PIX */}
              <div className="mb-6">
                <label className="input-label">Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => handlePixKeyChange(e.target.value)}
                  placeholder={
                    pixKeyType === 'cpf' ? '000.000.000-00' :
                    pixKeyType === 'email' ? 'seu@email.com' :
                    pixKeyType === 'phone' ? '(11) 99999-9999' :
                    'Chave aleatória'
                  }
                  maxLength={pixKeyType === 'cpf' ? 14 : pixKeyType === 'phone' ? 15 : 100}
                  className={`input-field ${pixKeyError ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {pixKeyError && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {pixKeyError}
                  </p>
                )}
                {!pixKeyError && pixKey && (
                  <p className="text-xs text-neon-green mt-2 flex items-center gap-1">
                    <CheckCircle size={12} />
                    Chave válida
                  </p>
                )}
              </div>

              {/* Aviso */}
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-xs text-yellow-400">
                  ⚠️ O valor será transferido em até 24 horas úteis. Confira os dados antes de confirmar.
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="btn-ghost flex-1"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleProcessWithdraw}
                  className="btn-primary flex-1 bg-red-500 hover:bg-red-600"
                  disabled={isProcessing || !amount || !pixKey || parseFloat(amount.replace(',', '.')) < 10}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    'Solicitar Saque'
                  )}
                </button>
              </div>
            </div>
            </div>
          )}
      </div>
    </Layout>
  );
}

// ============================================
// COMPONENTE: Item de Transação
// ============================================
function TransactionItem({ transaction }: { transaction: Transaction }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
  };

  const getTransactionIcon = () => {
    switch (transaction.type) {
      case 'deposit':
        return <ArrowDownLeft size={20} className="text-neon-green" />;
      case 'withdraw':
        return <ArrowUpRight size={20} className="text-red-400" />;
      case 'purchase':
        return <ShoppingCart size={20} className="text-neon-blue" />;
      case 'boost':
        return <Zap size={20} className="text-yellow-400" />;
      case 'premium':
        return <Crown size={20} className="text-neon-purple" />;
      case 'refund':
        return <RotateCcw size={20} className="text-neon-green" />;
      default:
        return <History size={20} className="text-gray-400" />;
    }
  };

  const getTransactionColor = () => {
    switch (transaction.type) {
      case 'deposit':
      case 'refund':
        return 'text-neon-green';
      case 'withdraw':
      case 'purchase':
      case 'boost':
      case 'premium':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBadge = () => {
    switch (transaction.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-neon-green">
            <CheckCircle size={12} />
            Concluído
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
            <Clock size={12} />
            Pendente
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-red-400">
            <XCircle size={12} />
            Falhou
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <XCircle size={12} />
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  const isPositive = transaction.type === 'deposit' || transaction.type === 'refund';

  return (
    <div className="card hover:border-dark-500 transition-colors">
      <div className="flex items-center gap-4">
        {/* Ícone */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isPositive ? 'bg-neon-green/10' : 'bg-red-500/10'
        }`}>
        {getTransactionIcon()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-white truncate">{transaction.typeLabel}</p>
        </div>
          <p className="text-sm text-gray-400 truncate">{transaction.description}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</span>
            {getStatusBadge()}
          </div>
      </div>

      {/* Valor */}
      <div className="text-right flex-shrink-0">
        <p className={`font-bold text-lg ${getTransactionColor()}`}>
            {isPositive ? '+' : '-'}
            {formatCurrency(transaction.amount)}
        </p>
          <p className="text-xs text-gray-500">
            Saldo: {formatCurrency(transaction.balanceAfter)}
          </p>
        </div>
      </div>
    </div>
  );
}
