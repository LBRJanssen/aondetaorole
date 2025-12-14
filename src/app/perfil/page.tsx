'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import {
  User,
  Mail,
  Phone,
  Crown,
  Settings,
  Bell,
  Shield,
  ShieldCheck,
  Headphones,
  LogOut,
  Edit,
  Save,
  X,
  Calendar,
  CheckCircle,
  PartyPopper,
  DollarSign,
} from 'lucide-react';

// Função para obter informações do badge de cargo
const getRoleBadgeInfo = (userType: string, isPremium: boolean) => {
  switch (userType) {
    case 'owner':
      return {
        show: true,
        label: 'Owner',
        icon: Crown,
        className: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
      };
    case 'admin':
      return {
        show: true,
        label: 'Admin',
        icon: ShieldCheck,
        className: 'bg-red-500/20 border-red-500/50 text-red-400',
      };
    case 'moderacao':
      return {
        show: true,
        label: 'Moderação',
        icon: Shield,
        className: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
      };
    case 'suporte':
      return {
        show: true,
        label: 'Suporte',
        icon: Headphones,
        className: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
      };
    case 'financeiro':
      return {
        show: true,
        label: 'Financeiro',
        icon: DollarSign,
        className: 'bg-green-500/20 border-green-500/50 text-green-400',
      };
    default:
      if (isPremium && (userType === 'common' || userType === 'premium')) {
        return {
          show: true,
          label: 'Premium',
          icon: Crown,
          className: 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple',
        };
      }
      return { show: false };
  }
};

// Função para obter informações do painel admin por cargo
const getAdminPanelInfo = (userType: string) => {
  switch (userType) {
    case 'owner':
      return {
        show: true,
        title: 'Painel Owner',
        description: 'Acesse o painel de controle total do sistema. Gerencie usuários, cargos e configurações.',
        icon: Crown,
        iconColor: 'text-yellow-400',
        buttonText: 'Acessar Painel Owner',
        buttonGradient: 'from-yellow-500 to-yellow-700 hover:from-yellow-600 hover:to-yellow-800',
        shadowColor: 'shadow-yellow-500/20',
      };
    case 'admin':
      return {
        show: true,
        title: 'Painel Administrativo',
        description: 'Acesse o painel administrativo para gerenciar eventos, usuários e muito mais.',
        icon: ShieldCheck,
        iconColor: 'text-red-400',
        buttonText: 'Acessar Painel Admin',
        buttonGradient: 'from-red-500 to-red-700 hover:from-red-600 hover:to-red-800',
        shadowColor: 'shadow-red-500/20',
      };
    case 'moderacao':
      return {
        show: true,
        title: 'Painel de Moderação',
        description: 'Acesse o painel de moderação para revisar eventos e gerenciar denúncias.',
        icon: Shield,
        iconColor: 'text-blue-400',
        buttonText: 'Acessar Moderação',
        buttonGradient: 'from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800',
        shadowColor: 'shadow-blue-500/20',
      };
    case 'suporte':
      return {
        show: true,
        title: 'Painel de Suporte',
        description: 'Acesse o painel de suporte para ajudar usuários e resolver tickets.',
        icon: Headphones,
        iconColor: 'text-emerald-400',
        buttonText: 'Acessar Suporte',
        buttonGradient: 'from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800',
        shadowColor: 'shadow-emerald-500/20',
      };
    case 'financeiro':
      return {
        show: true,
        title: 'Painel Financeiro',
        description: 'Acesse o painel financeiro para gerenciar transações, saques e relatórios financeiros.',
        icon: DollarSign,
        iconColor: 'text-green-400',
        buttonText: 'Acessar Financeiro',
        buttonGradient: 'from-green-500 to-green-700 hover:from-green-600 hover:to-green-800',
        shadowColor: 'shadow-green-500/20',
      };
    default:
      return { show: false };
  }
};
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PerfilPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser, logout, checkEmailConfirmation, resendConfirmationEmail } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    phone: '',
  });
  const [notifications, setNotifications] = useState({
    newEvents: true,
    eventReminders: true,
    boostUpdates: false,
  });
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/perfil');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setEditData({
        name: user.name,
        phone: user.phone || '',
      });
      
      // Verifica status de confirmação do email ao carregar
      if (!user.emailConfirmed) {
        checkEmailConfirmation();
      }
    }
  }, [user, checkEmailConfirmation]);
  
  const handleResendConfirmation = async () => {
    if (!user?.email) return;
    
    setResendingEmail(true);
    try {
      await resendConfirmationEmail(user.email);
      alert('Email de confirmação reenviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      alert(error.message || 'Erro ao reenviar email de confirmação');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSave = () => {
    updateUser({
      name: editData.name,
      phone: editData.phone || undefined,
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/home');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Layout>
      <div className="container-app py-8">
        <div className="max-w-2xl mx-auto">
          {/* Banner de email não confirmado */}
          {user && !user.emailConfirmed && (
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-yellow-400 font-semibold mb-1">Email não confirmado</h3>
                  <p className="text-yellow-300 text-sm mb-3">
                    Seu email ainda não foi confirmado. Verifique sua caixa de entrada e clique no link de confirmação.
                  </p>
                  <button
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                    className="text-sm text-yellow-400 hover:text-yellow-300 underline disabled:opacity-50"
                  >
                    {resendingEmail ? 'Reenviando...' : 'Reenviar email de confirmação'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl text-white mb-2">
              Meu <span className="text-neon-pink">Perfil</span>
            </h1>
            <p className="text-gray-400">Gerencie suas informacoes e configuracoes</p>
          </div>

          {/* Card principal */}
          <div className="card mb-6">
            {/* Avatar e info basica */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-3xl font-display font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-xl text-white">{user.name}</h2>
                  {(() => {
                    const badge = getRoleBadgeInfo(user.userType, user.isPremium);
                    if (badge.show && badge.icon) {
                      const IconComponent = badge.icon;
                      return (
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1 ${badge.className}`}>
                          <IconComponent size={12} />
                          {badge.label}
                    </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <p className="text-gray-400">{user.email}</p>
                <p className="text-sm text-gray-500">
                  Membro desde {format(new Date(user.createdAt), "MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`btn-ghost p-2 ${isEditing ? 'text-red-400' : 'text-gray-400'}`}
              >
                {isEditing ? <X size={20} /> : <Edit size={20} />}
              </button>
            </div>

            {/* Formulario de edicao */}
            {isEditing ? (
              <div className="space-y-4 pt-6 border-t border-dark-600">
                <div>
                  <label className="input-label">Nome</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Telefone</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <button onClick={handleSave} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Save size={18} />
                  Salvar Alteracoes
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-6 border-t border-dark-600">
                <div className="flex items-center gap-3 text-gray-300">
                  <Mail size={18} className="text-gray-500" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone size={18} className="text-gray-500" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar size={18} className="text-gray-500" />
                  <span>Conta criada em {format(new Date(user.createdAt), 'dd/MM/yyyy')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Minhas Festas */}
          <div className="card mb-6">
            <div className="flex items-center gap-3 mb-4">
              <PartyPopper size={24} className="text-neon-pink" />
              <h3 className="font-display font-bold text-lg text-white">Minhas Festas</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Gerencie os eventos que voce criou. Edite detalhes, veja estatisticas e muito mais.
            </p>
            <Link
              href="/festas?category=my-events"
              className="btn-primary w-full text-center block flex items-center justify-center gap-2"
            >
              <PartyPopper size={18} />
              Ver Minhas Festas
            </Link>
          </div>

          {/* Painel Administrativo - Para cargos especiais */}
          {(() => {
            const adminPanel = getAdminPanelInfo(user.userType);
            if (adminPanel.show && adminPanel.icon) {
              const IconComponent = adminPanel.icon;
              return (
            <div className="card mb-6">
              <div className="flex items-center gap-3 mb-4">
                    <IconComponent size={24} className={adminPanel.iconColor} />
                    <h3 className="font-display font-bold text-lg text-white">{adminPanel.title}</h3>
              </div>
              <p className="text-gray-400 mb-4">
                    {adminPanel.description}
              </p>
              <Link
                href="/admin"
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r ${adminPanel.buttonGradient} text-white font-semibold rounded-lg transition-all shadow-lg ${adminPanel.shadowColor}`}
              >
                    <IconComponent size={18} />
                    {adminPanel.buttonText}
              </Link>
            </div>
              );
            }
            return null;
          })()}

          {/* Plano Premium */}
          <div className="card mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown size={24} className="text-neon-purple" />
              <h3 className="font-display font-bold text-lg text-white">Plano</h3>
            </div>

            {user.isPremium ? (
              <div className="bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 border border-neon-pink/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">Premium Ativo</span>
                  <CheckCircle size={20} className="text-neon-green" />
                </div>
                {user.premiumExpiresAt && (
                  <p className="text-sm text-gray-400">
                    Expira em {format(new Date(user.premiumExpiresAt), 'dd/MM/yyyy')}
                  </p>
                )}
                <button className="btn-secondary w-full mt-4">
                  Gerenciar Assinatura
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 mb-4">
                  Voce esta usando o plano gratuito. Faca upgrade para ter acesso ao dashboard de organizador, 
                  lista de convidados e muito mais.
                </p>
                <Link href="/premium" className="btn-primary w-full text-center block">
                  <Crown size={18} className="mr-2 inline" />
                  Seja Premium
                </Link>
              </div>
            )}
          </div>

          {/* Notificacoes */}
          <div className="card mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell size={24} className="text-neon-blue" />
              <h3 className="font-display font-bold text-lg text-white">Notificacoes</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Novos eventos</p>
                  <p className="text-sm text-gray-500">Receba alertas de novos eventos proximos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.newEvents}
                    onChange={(e) => setNotifications({ ...notifications, newEvents: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-pink"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Lembretes de eventos</p>
                  <p className="text-sm text-gray-500">Seja lembrado dos eventos que voce confirmou</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.eventReminders}
                    onChange={(e) => setNotifications({ ...notifications, eventReminders: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-pink"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Atualizacoes de boost</p>
                  <p className="text-sm text-gray-500">Notificacoes sobre boosts nos seus eventos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.boostUpdates}
                    onChange={(e) => setNotifications({ ...notifications, boostUpdates: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-pink"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Seguranca */}
          <div className="card mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={24} className="text-neon-green" />
              <h3 className="font-display font-bold text-lg text-white">Seguranca</h3>
            </div>

            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                <span className="text-gray-300">Alterar senha</span>
                <Edit size={18} className="text-gray-500" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                <span className="text-gray-300">Autenticacao em duas etapas</span>
                <span className="text-sm text-gray-500">Desativado</span>
              </button>
            </div>
          </div>

          {/* Sair */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-dark-800 hover:bg-red-500/20 border border-dark-600 hover:border-red-500/50 rounded-lg text-red-400 transition-all"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>
        </div>
      </div>
    </Layout>
  );
}

