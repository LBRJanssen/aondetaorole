'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { useToast } from '@/contexts/ToastContext';
import SubscriptionModal from '@/components/Premium/SubscriptionModal';
import {
  Crown,
  Check,
  LayoutDashboard,
  Users,
  Download,
  BarChart3,
  Eye,
  Shield,
  Zap,
  Star,
  ArrowRight,
  Sparkles,
  Flame,
  Loader2,
  X,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PLAN_BENEFITS, getBenefitAccess, getBenefitDescription, getAccessLabel, type BenefitAccess, type PlanName } from '@/utils/premiumPlans';

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

interface Benefit {
  name: string;
  description: string;
  icon: string;
}

interface SubscriptionStatus {
  isPremium: boolean;
  hasSubscription: boolean;
  subscription: {
    plan: {
      name: string;
      displayName: string;
    } | null;
    expiresAt: string;
    daysRemaining: number;
    isActive: boolean;
  } | null;
}

export default function PremiumPage() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuthStore();
  const { wallet, fetchBalance } = useWalletStore();
  const { showToast } = useToast();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlans();
      fetchBenefits();
      fetchSubscriptionStatus();
      fetchBalance();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/premium/plans', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.data.plans);
        const popularPlan = data.data.plans.find((p: Plan) => p.isPopular);
        if (popularPlan) {
          setSelectedPlan(popularPlan.name);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBenefits = async () => {
    try {
      const response = await fetch('/api/premium/plans');
      const data = await response.json();
      
      if (data.success) {
        setBenefits(data.data.benefits);
      }
    } catch (error) {
      console.error('Erro ao buscar benefícios:', error);
    }
  };

  const fetchSubscriptionStatus = async () => {
    if (!isAuthenticated) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/premium/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSubscriptionStatus(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    }
  };

  const handleSelectPlan = (planName: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/premium');
      return;
    }

    if (subscriptionStatus?.isPremium) {
      showToast('Você já possui uma assinatura ativa', 'info');
      return;
    }

    setSelectedPlan(planName);
    setShowModal(true);
  };

  const handleSubscriptionSuccess = async () => {
    await refreshUser();
    await fetchSubscriptionStatus();
    await fetchBalance();
    setShowModal(false);
    showToast('Assinatura ativada com sucesso!', 'success');
    router.push('/dashboard');
  };

  const selectedPlanData = plans.find(p => p.name === selectedPlan);

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'layout-dashboard': LayoutDashboard,
      'users': Users,
      'download': Download,
      'bar-chart': BarChart3,
      'star': Star,
      'headphones': Shield,
      'infinity': Sparkles,
      'badge-check': Crown,
      'eye-off': Eye,
      'zap': Zap,
    };
    return iconMap[iconName] || Sparkles;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 size={48} className="animate-spin text-neon-pink" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-dark-900 via-dark-900 to-dark-950">
        <div className="container-app py-16 md:py-24">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-neon-purple/30 via-neon-pink/30 to-neon-purple/30 border-2 border-neon-purple/60 rounded-full mb-8 backdrop-blur-md shadow-2xl shadow-neon-purple/40 hover:shadow-neon-purple/60 transition-all duration-300 hover:scale-105 hover:border-neon-pink/60 animate-pulse">
              <Sparkles size={24} className="text-neon-purple animate-pulse" />
              <span className="bg-gradient-to-r from-neon-purple via-neon-pink to-neon-purple bg-clip-text text-transparent font-bold text-lg md:text-xl tracking-wide drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]">
                Seja um Organizador Premium
              </span>
            </div>
            <h1 className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-tight">
              Eleve seus <span className="bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">eventos</span> a outro nível
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Tenha acesso a ferramentas exclusivas para gerenciar suas festas como um profissional
            </p>
          </div>

          {/* Status da Assinatura Atual */}
          {subscriptionStatus?.isPremium && subscriptionStatus.subscription && (
            <div className="max-w-4xl mx-auto mb-16">
              <div className="relative overflow-hidden bg-gradient-to-r from-neon-purple/20 via-neon-pink/20 to-neon-purple/20 border-2 border-neon-purple/50 rounded-2xl p-8 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 to-transparent opacity-50" />
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-lg shadow-neon-pink/30">
                      <Crown size={36} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-2xl text-white mb-2">
                        Premium Ativo
                      </h3>
                      <p className="text-gray-200 text-lg mb-1">
                        Plano: <span className="font-semibold text-white">{subscriptionStatus.subscription.plan?.displayName || 'Premium'}</span>
                      </p>
                      <p className="text-sm text-gray-400">
                        Expira em {formatDate(subscriptionStatus.subscription.expiresAt)} 
                        <span className="ml-2 text-neon-green">({subscriptionStatus.subscription.daysRemaining} dias restantes)</span>
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-neon-green/20 border-2 border-neon-green/50 rounded-xl backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                    <span className="text-neon-green font-bold text-lg">Ativo</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="max-w-7xl mx-auto mb-24">
            <h2 className="font-display font-bold text-4xl md:text-5xl text-white text-center mb-4">
              Escolha seu plano
            </h2>
            <p className="text-center text-gray-400 text-lg mb-12">
              Planos flexíveis para todos os tipos de organizadores
            </p>

            <div className="grid md:grid-cols-3 gap-8 lg:gap-10" style={{ gridAutoRows: '1fr' }}>
              {plans.map((plan, index) => {
                const isSelected = selectedPlan === plan.name;
                const isPopular = plan.isPopular;
                
                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.name)}
                    className="relative group cursor-pointer transition-all duration-300 flex flex-col"
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <div className="px-4 py-1.5 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full shadow-lg shadow-neon-pink/50">
                          <div className="flex items-center gap-1.5">
                            <Star size={14} className="text-white fill-white" />
                            <span className="text-white font-bold text-sm">Mais Popular</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className={`relative flex flex-col rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-br from-neon-pink/20 via-neon-purple/20 to-neon-pink/20 border-neon-pink shadow-2xl shadow-neon-pink/30'
                          : isPopular
                          ? 'bg-gradient-to-br from-dark-800 to-dark-900 border-neon-purple/50 hover:border-neon-purple shadow-xl'
                          : 'bg-dark-800 border-dark-600 hover:border-dark-500 hover:shadow-lg'
                      }`}
                      style={{ minHeight: '650px', height: '100%', boxSizing: 'border-box' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative p-8 flex flex-col h-full">
                        {/* Header */}
                        <div className="mb-6">
                          <h3 className={`font-display font-bold text-3xl mb-3 ${
                            plan.name === 'basic' 
                              ? 'bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]' 
                              : plan.name === 'pro'
                              ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                              : 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]'
                          }`}>
                            {plan.displayName}
                          </h3>
                          <p className="text-gray-300 text-base leading-relaxed font-medium">
                            {plan.description}
                          </p>
                        </div>

                        {/* Boost Discount Badge */}
                        {plan.boostDiscountPercent > 0 && (
                          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-xl">
                            <Flame size={16} className="text-orange-400" />
                            <span className="text-orange-400 font-bold text-sm">
                              {plan.boostDiscountPercent}% OFF em Boosts
                            </span>
                          </div>
                        )}

                        {/* Price */}
                        <div className="mb-8 pb-8 border-b border-dark-600/50">
                          <div className="flex items-baseline gap-2">
                            <span className="font-display font-bold text-5xl text-white">
                              {formatCurrency(plan.pricePerMonth).split(',')[0]}
                            </span>
                            <span className="text-2xl text-gray-400">,{formatCurrency(plan.pricePerMonth).split(',')[1]}</span>
                            <span className="text-gray-500 text-lg ml-1">/mês</span>
                          </div>
                        </div>

                        {/* Benefits List - Apenas benefícios disponíveis */}
                        <div className="space-y-4 mb-6 flex-grow">
                          {PLAN_BENEFITS.filter(b => {
                            const planName = plan.name as PlanName;
                            const access = getBenefitAccess(b, planName);
                            return b.id !== 'boost-discount' && access !== 'none';
                          }).map((benefit) => {
                            const planName = plan.name as PlanName;
                            const access = getBenefitAccess(benefit, planName);
                            const description = getBenefitDescription(benefit, planName);
                            
                            return (
                              <div key={benefit.id} className="flex items-start gap-4 py-3 px-2 rounded-lg hover:bg-dark-700/30 transition-colors">
                                {access === 'full' ? (
                                  <div className="mt-1 w-6 h-6 rounded-full bg-neon-green/30 flex items-center justify-center flex-shrink-0 border border-neon-green/50">
                                    <Check size={16} className="text-neon-green" />
                                  </div>
                                ) : access === 'partial' ? (
                                  <div className="mt-1 w-6 h-6 rounded-full bg-orange-400/30 flex items-center justify-center flex-shrink-0 border-2 border-orange-400/50">
                                    <Check size={14} className="text-orange-400" />
                                  </div>
                                ) : (
                                  <div className="mt-1 w-6 h-6 rounded-full bg-yellow-400/30 flex items-center justify-center flex-shrink-0 border-2 border-yellow-400/50">
                                    <Check size={14} className="text-yellow-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className={`text-base font-semibold block leading-tight ${access === 'full' ? 'text-white' : 'text-gray-200'}`}>
                                    {benefit.name}
                                  </span>
                                  {access !== 'full' && description && (
                                    <span className="block text-sm mt-1.5 font-medium leading-relaxed" style={{ color: access === 'partial' ? '#fb923c' : '#facc15' }}>
                                      {description}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Desconto em Boosts */}
                          <div className="flex items-center gap-4 py-3 px-2 border-t-2 border-dark-600/50 mt-auto pt-4 rounded-lg bg-orange-500/5">
                            <div className="w-6 h-6 rounded-full bg-orange-400/30 flex items-center justify-center flex-shrink-0 border border-orange-400/50">
                              <Flame size={16} className="text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-base font-semibold block text-white leading-tight">
                                Desconto em Boosts
                              </span>
                              <span className="block text-sm font-bold text-orange-400 mt-1.5">
                                {plan.boostDiscountPercent}% OFF
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* CTA Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPlan(plan.name);
                          }}
                          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                            isSelected
                              ? 'bg-gradient-to-r from-neon-pink to-neon-purple text-white shadow-lg shadow-neon-pink/30 hover:shadow-neon-pink/50'
                              : 'bg-dark-700 text-white border-2 border-dark-600 hover:border-neon-purple/50 hover:bg-dark-600'
                          }`}
                        >
                          {isSelected ? 'Plano Selecionado' : 'Escolher Plano'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main CTA */}
            <div className="mt-12 text-center">
              <button
                onClick={() => selectedPlan && handleSelectPlan(selectedPlan)}
                disabled={!selectedPlan || subscriptionStatus?.isPremium}
                className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscriptionStatus?.isPremium ? (
                  <>
                    <Check size={22} />
                    Você já é Premium!
                  </>
                ) : (
                  <>
                    <Crown size={22} />
                    Assinar Agora
                    <ArrowRight size={22} />
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Pagamento seguro via PIX, cartão de crédito ou carteira
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="max-w-7xl mx-auto mb-24">
            <div className="text-center mb-12">
              <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
                Recursos Exclusivos
              </h2>
              <p className="text-gray-400 text-lg">
                Tudo que você precisa para criar eventos incríveis
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PLAN_BENEFITS
                .filter(benefit => benefit.id !== 'boost-discount')
                .map((benefit, index) => {
                  const Icon = getIcon(benefit.icon);
                  return (
                    <div
                      key={benefit.id}
                      className="group relative bg-dark-800/50 border border-dark-600/50 rounded-xl p-6 hover:border-neon-pink/50 transition-all duration-300 hover:shadow-lg hover:shadow-neon-pink/10"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/5 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300" />
                      <div className="relative">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                          <Icon size={28} className="text-neon-pink" />
                        </div>
                        <h3 className="font-display font-bold text-xl text-white mb-2">
                          {benefit.name}
                        </h3>
                        <p className="text-gray-400 leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="text-center mb-12">
              <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-gray-400 text-lg">
                Tire suas dúvidas sobre os planos Premium
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: 'Posso cancelar a qualquer momento?',
                  a: 'Sim! Você pode cancelar sua assinatura quando quiser. O acesso premium continua até o fim do período pago.',
                },
                {
                  q: 'Como funciona o pagamento?',
                  a: 'Aceitamos PIX, cartão de crédito e débito, ou você pode usar o saldo da sua carteira. O pagamento é processado de forma segura.',
                },
                {
                  q: 'Quais os benefícios exclusivos do Premium?',
                  a: 'Acesso ao dashboard de organizador, gestão de lista de convidados, exportação de dados, estatísticas detalhadas, destaque visual nos seus eventos e descontos em boosts.',
                },
                {
                  q: 'O desconto em boosts funciona imediatamente?',
                  a: 'Sim! Assim que você assinar, o desconto será aplicado automaticamente em todas as compras de boosts.',
                },
              ].map((item, index) => (
                <div 
                  key={index} 
                  className="bg-dark-800/50 border border-dark-600/50 rounded-xl p-6 hover:border-neon-pink/30 transition-all duration-300"
                >
                  <h4 className="font-semibold text-white text-lg mb-3">{item.q}</h4>
                  <p className="text-gray-400 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <SubscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        plan={selectedPlanData || null}
        onSuccess={handleSubscriptionSuccess}
      />
    </Layout>
  );
}
