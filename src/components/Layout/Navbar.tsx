'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  Map, 
  PartyPopper, 
  PlusCircle, 
  LayoutDashboard, 
  User, 
  Crown,
  LogIn,
  LogOut,
  Ticket,
  Shield,
  ShieldCheck,
  Headphones,
  Flame,
  DollarSign
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import WalletBalance from '@/components/Wallet/WalletBalance';

// Links de navegacao principal
const mainNavLinks = [
  { href: '/home', label: 'Mapa', icon: Map },
  { href: '/festas', label: 'Festas', icon: PartyPopper },
  { href: '/cadastro-festa', label: 'Cadastrar', icon: PlusCircle },
];

// Função para obter informações do badge de cargo
const getRoleBadge = (userType: string, isPremium: boolean) => {
  // Cargos especiais têm prioridade sobre Premium
  switch (userType) {
    case 'owner':
      return {
        show: true,
        label: 'Owner',
        icon: Crown,
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/50',
        textColor: 'text-yellow-400',
        isStaff: true,
      };
    case 'admin':
      return {
        show: true,
        label: 'Admin',
        icon: ShieldCheck,
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/50',
        textColor: 'text-red-400',
        isStaff: true,
      };
    case 'moderacao':
      return {
        show: true,
        label: 'Moderação',
        icon: Shield,
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/50',
        textColor: 'text-blue-400',
        isStaff: true,
      };
    case 'suporte':
      return {
        show: true,
        label: 'Suporte',
        icon: Headphones,
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/50',
        textColor: 'text-emerald-400',
        isStaff: true,
      };
    case 'financeiro':
      return {
        show: true,
        label: 'Financeiro',
        icon: DollarSign,
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/50',
        textColor: 'text-green-400',
        isStaff: true,
      };
    default:
      // Só mostra Premium para usuários comuns que têm premium
      if (isPremium && (userType === 'common' || userType === 'premium')) {
        return {
          show: true,
          label: 'Premium',
          icon: Crown,
          bgColor: 'bg-neon-purple/20',
          borderColor: 'border-neon-purple/50',
          textColor: 'text-neon-purple',
          isStaff: false,
        };
      }
      return { show: false, isStaff: false };
  }
};

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  const isActive = (href: string) => pathname === href;

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  // Obtém informações do badge
  const roleBadge = user ? getRoleBadge(user.userType, user.isPremium) : { show: false };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[2000] glass w-full max-w-full overflow-hidden">
      <div className="container-app w-full max-w-full">
        <div className="flex items-center justify-between h-16 gap-1 sm:gap-2 min-w-0 w-full">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-neon-pink to-neon-purple rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-white text-base sm:text-lg">R</span>
            </div>
            <span className="font-display font-bold text-xs sm:text-base md:text-lg hidden sm:block whitespace-nowrap">
              AONDE TA O <span className="text-neon-pink">ROLE</span>
            </span>
            {isAuthenticated && roleBadge.show && roleBadge.icon && (
              <span className={`text-xs flex-shrink-0 hidden sm:inline-flex ml-2 px-2.5 py-1 rounded-full border font-semibold items-center gap-1 ${roleBadge.bgColor} ${roleBadge.borderColor} ${roleBadge.textColor}`}>
                <roleBadge.icon size={12} />
                {roleBadge.label}
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 flex-shrink-0 min-w-0">
            {mainNavLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                    isActive(link.href)
                      ? 'bg-neon-pink/20 text-neon-pink'
                      : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">{link.label}</span>
                </Link>
              );
            })}

            {/* Meus Ingressos - apenas autenticado */}
            {isAuthenticated && user && (
              <Link
                href="/meus-ingressos"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  isActive('/meus-ingressos')
                    ? 'bg-neon-pink/20 text-neon-pink'
                    : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                }`}
              >
                <Ticket size={16} className="flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base">Meus Ingressos</span>
              </Link>
            )}

            {/* Meus Boosts - apenas autenticado */}
            {isAuthenticated && user && (
              <Link
                href="/meus-boosts"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  isActive('/meus-boosts')
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                }`}
              >
                <Flame size={16} className="flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base">Meus Boosts</span>
              </Link>
            )}

            {/* Dashboard - apenas premium */}
            {user?.isPremium && (
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  isActive('/dashboard')
                    ? 'bg-neon-pink/20 text-neon-pink'
                    : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                }`}
              >
                <LayoutDashboard size={16} className="flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base">Dashboard</span>
              </Link>
            )}

            {/* Painel Admin - apenas staff (owner, admin, moderacao, suporte) */}
            {roleBadge.isStaff && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  isActive('/admin')
                    ? `${roleBadge.bgColor} ${roleBadge.textColor}`
                    : `text-gray-300 hover:${roleBadge.bgColor} hover:${roleBadge.textColor}`
                }`}
              >
                {roleBadge.icon && <roleBadge.icon size={16} className="flex-shrink-0" />}
                <span className="font-medium text-sm sm:text-base">Painel</span>
              </Link>
            )}
          </div>

          {/* User Menu Desktop */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
            {isAuthenticated && user ? (
              <>
                <div className="flex-shrink-0">
                  <WalletBalance />
                </div>
                <Link
                  href="/perfil"
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-lg transition-all duration-300 flex-shrink-0 ${
                    isActive('/perfil')
                      ? 'bg-neon-pink/20 text-neon-pink'
                      : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                  }`}
                >
                  <User size={16} className="flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base max-w-[80px] xl:max-w-[90px] truncate hidden xl:inline">{user.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-gray-400 hover:bg-dark-700 hover:text-red-400 transition-all duration-300 flex-shrink-0"
                  title="Sair"
                >
                  <LogOut size={16} className="flex-shrink-0" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost py-2 px-3 sm:px-4 text-sm sm:text-base whitespace-nowrap flex-shrink-0">
                  Entrar
                </Link>
                <Link href="/registro" className="btn-primary py-2 px-3 sm:px-4 text-sm sm:text-base whitespace-nowrap flex-shrink-0">
                  Cadastrar
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-dark-700 transition-colors flex-shrink-0"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-600 animate-slide-up">
            <div className="flex flex-col gap-2">
              {mainNavLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                      isActive(link.href)
                        ? 'bg-neon-pink/20 text-neon-pink'
                        : 'text-gray-300 hover:bg-dark-700'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}

              {isAuthenticated && user && (
                <Link
                  href="/meus-ingressos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    isActive('/meus-ingressos')
                      ? 'bg-neon-pink/20 text-neon-pink'
                      : 'text-gray-300 hover:bg-dark-700'
                  }`}
                >
                  <Ticket size={20} />
                  <span className="font-semibold text-base">Meus Ingressos</span>
                </Link>
              )}

              {isAuthenticated && user && (
                <Link
                  href="/meus-boosts"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    isActive('/meus-boosts')
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'text-gray-300 hover:bg-dark-700'
                  }`}
                >
                  <Flame size={20} />
                  <span className="font-semibold text-base">Meus Boosts</span>
                </Link>
              )}

              {user?.isPremium && (
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    isActive('/dashboard')
                      ? 'bg-neon-pink/20 text-neon-pink'
                      : 'text-gray-300 hover:bg-dark-700'
                  }`}
                >
                  <LayoutDashboard size={20} />
                  <span className="font-medium">Dashboard</span>
                </Link>
              )}

              {/* Painel Admin - apenas staff (owner, admin, moderacao, suporte) */}
              {roleBadge.isStaff && roleBadge.icon && (
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    isActive('/admin')
                      ? `${roleBadge.bgColor} ${roleBadge.textColor}`
                      : `${roleBadge.textColor} hover:${roleBadge.bgColor}`
                  }`}
                >
                  <roleBadge.icon size={20} />
                  <span className="font-medium">Painel {roleBadge.label}</span>
                </Link>
              )}

              <div className="divider" />

              {isAuthenticated && user ? (
                <>
                  <Link
                    href="/meus-ingressos"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 whitespace-nowrap ${
                      isActive('/meus-ingressos')
                        ? 'bg-neon-pink/20 text-neon-pink'
                        : 'text-gray-300 hover:bg-dark-700'
                    }`}
                  >
                    <Ticket size={22} />
                    <span className="font-semibold text-base">Meus Ingressos</span>
                  </Link>
                  <div className="px-4 py-2">
                    <WalletBalance />
                  </div>
                  <Link
                    href="/perfil"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-dark-700"
                  >
                    <User size={20} />
                    <span className="font-medium">{user.name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-dark-700 w-full text-left"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Sair</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-dark-700"
                  >
                    <LogIn size={20} />
                    <span className="font-medium">Entrar</span>
                  </Link>
                  <Link
                    href="/registro"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn-primary text-center mx-4"
                  >
                    Criar Conta
                  </Link>
                </>
              )}

              {/* Seja Premium - apenas se nao for premium */}
              {(!isAuthenticated || !user?.isPremium) && (
                <>
                  <div className="divider" />
                  <Link
                    href="/premium"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-neon-purple hover:bg-dark-700"
                  >
                    <Crown size={20} />
                    <span className="font-medium">Seja Premium</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

