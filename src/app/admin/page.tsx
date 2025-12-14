'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { Shield, Calendar, Users, Database, RefreshCw, LogOut, Crown, MessageSquare, Headphones, BarChart3, ChevronRight, Terminal, Wallet, DollarSign, TrendingUp } from 'lucide-react';
import AdminEvents from '@/components/Admin/AdminEvents';
import AdminUsers from '@/components/Admin/AdminUsers';
import AdminTestDB from '@/components/Admin/AdminTestDB';
import AdminQuerySQL from '@/components/Admin/AdminQuerySQL';
import AdminMigrateEvents from '@/components/Admin/AdminMigrateEvents';
import AdminOwner from '@/components/Admin/AdminOwner';
import AdminAdmin from '@/components/Admin/AdminAdmin';
import AdminModeration from '@/components/Admin/AdminModeration';
import AdminSupport from '@/components/Admin/AdminSupport';
import AdminStatistics from '@/components/Admin/AdminStatistics';
import AdminDetailedAnalytics from '@/components/Admin/AdminDetailedAnalytics';
import AdminPlatformWallet from '@/components/Admin/AdminPlatformWallet';
import AdminFinanceiro from '@/components/Admin/AdminFinanceiro';

type MainSection = 'events' | 'users' | 'statistics' | 'detailed-analytics';
type RoleSection = 'owner' | 'admin' | 'moderation' | 'support';
type AdminSection = MainSection | RoleSection | 'test-db' | 'query-sql' | 'migrate' | 'platform-wallet' | 'financeiro';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { checkPermission, checkIsOwner, checkIsAdmin, checkIsModeration, checkIsSupport, checkHasFinancialAccess, isLoading: permissionsLoading, userRole } = usePermissions();
  const [activeSection, setActiveSection] = useState<AdminSection>('events');
  const [hasAccess, setHasAccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main']));
  const [sectionPermissions, setSectionPermissions] = useState<Record<string, boolean>>({});

  // Seções principais (acessíveis por quem tem permissão)
  const mainSections = useMemo(() => [
    { id: 'events' as MainSection, label: 'Eventos', icon: Calendar, permission: 'events.view_all' },
    { id: 'users' as MainSection, label: 'Usuários', icon: Users, permission: 'users.view_all' },
    { id: 'statistics' as MainSection, label: 'Estatísticas', icon: BarChart3, permission: 'admin.stats' },
    { id: 'detailed-analytics' as MainSection, label: 'Análises Detalhadas', icon: TrendingUp, permission: 'admin.stats' },
  ], []);

  // Seções de cargos (acessíveis apenas pelos respectivos cargos)
  const roleSections = useMemo(() => [
    { id: 'owner' as RoleSection, label: 'Owner', icon: Crown, permission: 'system.configure', role: 'owner' },
    { id: 'admin' as RoleSection, label: 'Admin', icon: Shield, permission: 'admin.dashboard', role: 'admin' },
    { id: 'moderation' as RoleSection, label: 'Moderação', icon: MessageSquare, permission: 'moderation.view_reports', role: 'moderacao' },
    { id: 'support' as RoleSection, label: 'Suporte', icon: Headphones, permission: 'support.view_tickets', role: 'suporte' },
    { id: 'platform-wallet' as AdminSection, label: 'Carteira Plataforma', icon: Wallet, permission: 'financial.view_platform_wallet', role: 'financeiro' },
    { id: 'financeiro' as AdminSection, label: 'Financeiro', icon: DollarSign, permission: 'financial.view_platform_wallet', role: 'financeiro' },
  ], []);

  // Seções técnicas (apenas para desenvolvimento)
  const technicalSections = useMemo(() => [
    { id: 'test-db' as AdminSection, label: 'Teste Banco de Dados', icon: Database },
    { id: 'query-sql' as AdminSection, label: 'Teste de Query SQL', icon: Terminal },
    { id: 'migrate' as AdminSection, label: 'Migrar Festas', icon: RefreshCw },
  ], []);

  // Redireciona se não estiver autenticado
  useEffect(() => {
    if (!permissionsLoading && !isAuthenticated) {
      router.push('/login?redirect=/admin');
    }
  }, [isAuthenticated, permissionsLoading, router]);

  // Verifica permissões para todas as seções
  useEffect(() => {
    async function checkAllPermissions() {
      if (!isAuthenticated || permissionsLoading) return;

      // Verifica se tem permissão admin.dashboard OU se é owner/admin/moderação/suporte/financeiro
      const hasPermission = await checkPermission('admin.dashboard');
      const hasRole = checkIsOwner() || checkIsAdmin() || checkIsModeration() || checkIsSupport() || checkHasFinancialAccess();
      const canAccess = hasPermission || hasRole;
      
      if (!canAccess) {
        console.log('❌ [Admin] Sem permissão para acessar painel. User:', user?.userType, '| Role:', userRole);
        router.push('/home');
        return;
      }
      
      console.log('✅ [Admin] Acesso permitido. User:', user?.userType, '| Role:', userRole);
      setHasAccess(true);

      // Verifica permissões de cada seção
      const permissions: Record<string, boolean> = {};
      
      for (const section of mainSections) {
        permissions[section.id] = await checkPermission(section.permission);
      }
      
      for (const section of roleSections) {
        permissions[section.id] = await checkPermission(section.permission);
      }
      
      setSectionPermissions(permissions);
    }
    checkAllPermissions();
  }, [isAuthenticated, permissionsLoading, checkPermission, router, mainSections, roleSections]);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  if (permissionsLoading || !hasAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield size={48} className="mx-auto text-gray-500 mb-4 animate-pulse" />
            <p className="text-gray-400">Verificando permissões...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'events':
        return <AdminEvents />;
      case 'users':
        return <AdminUsers />;
      case 'statistics':
        return <AdminStatistics />;
      case 'detailed-analytics':
        return <AdminDetailedAnalytics />;
      case 'owner':
        return <AdminOwner />;
      case 'admin':
        return <AdminAdmin />;
      case 'moderation':
        return <AdminModeration />;
      case 'support':
        return <AdminSupport />;
      case 'platform-wallet':
        return <AdminPlatformWallet />;
      case 'financeiro':
        return <AdminFinanceiro />;
      case 'test-db':
        return <AdminTestDB />;
      case 'query-sql':
        return <AdminQuerySQL />;
      case 'migrate':
        return <AdminMigrateEvents />;
      default:
        return <AdminEvents />;
    }
  };

  return (
    <Layout>
      <div className="bg-dark-900 h-[calc(100vh-4rem)]">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 bg-dark-800 border-b lg:border-b-0 lg:border-r border-dark-600 flex flex-col flex-shrink-0">
            {/* Header da Sidebar */}
            <div className="p-6 border-b border-dark-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-display font-bold text-lg text-white truncate">
                    Painel Admin
                  </h1>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.name || 'Carregando...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Navegação Hierárquica */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {/* Seções Principais */}
              <div>
                <button
                  onClick={() => toggleSection('main')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
                >
                  <span>PRINCIPAIS</span>
                  <ChevronRight 
                    size={16} 
                    className={`transition-transform ${expandedSections.has('main') ? 'rotate-90' : ''}`}
                  />
                </button>
                {expandedSections.has('main') && (
                  <div className="ml-2 mt-1 space-y-1">
                    {mainSections.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.id;
                      const hasPermission = sectionPermissions[section.id] ?? false;
                      
                      if (!hasPermission) return null;
                      
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                            isActive
                              ? 'bg-neon-pink/20 border border-neon-pink/50 text-neon-pink'
                              : 'text-gray-400 hover:bg-dark-700 hover:text-white border border-transparent'
                          }`}
                        >
                          <Icon size={18} className="flex-shrink-0" />
                          <span className="font-medium">{section.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seções de Cargos */}
              <div className="mt-4">
                <button
                  onClick={() => toggleSection('roles')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
                >
                  <span>CARGOS</span>
                  <ChevronRight 
                    size={16} 
                    className={`transition-transform ${expandedSections.has('roles') ? 'rotate-90' : ''}`}
                  />
                </button>
                {expandedSections.has('roles') && (
                  <div className="ml-2 mt-1 space-y-1">
                    {roleSections.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.id;
                      const hasPermission = sectionPermissions[section.id] ?? false;
                      
                      if (!hasPermission) return null;
                      
                      // Cores específicas por cargo
                      const getColorClasses = () => {
                        if (isActive) {
                          switch (section.role) {
                            case 'owner': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
                            case 'admin': return 'bg-red-500/20 border-red-500/50 text-red-400';
                            case 'moderacao': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
                            case 'suporte': return 'bg-green-500/20 border-green-500/50 text-green-400';
                            case 'financeiro': return 'bg-purple-500/20 border-purple-500/50 text-purple-400';
                            default: return 'bg-neon-pink/20 border-neon-pink/50 text-neon-pink';
                          }
                        }
                        return 'text-gray-400 hover:bg-dark-700 hover:text-white border border-transparent';
                      };
                      
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${getColorClasses()}`}
                        >
                          <Icon size={18} className="flex-shrink-0" />
                          <span className="font-medium">{section.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seções Técnicas (apenas para desenvolvimento) */}
              {(checkIsOwner() || checkIsAdmin()) && (
                <div className="mt-4">
                  <button
                    onClick={() => toggleSection('technical')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
                  >
                    <span>TÉCNICO</span>
                    <ChevronRight 
                      size={16} 
                      className={`transition-transform ${expandedSections.has('technical') ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {expandedSections.has('technical') && (
                    <div className="ml-2 mt-1 space-y-1">
                      {technicalSections.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;
                        
                        return (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                              isActive
                                ? 'bg-gray-500/20 border border-gray-500/50 text-gray-400'
                                : 'text-gray-500 hover:bg-dark-700 hover:text-gray-300 border border-transparent'
                            }`}
                          >
                            <Icon size={18} className="flex-shrink-0" />
                            <span className="font-medium">{section.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* Footer da Sidebar */}
            <div className="p-4 border-t border-dark-600">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-dark-700 hover:text-red-400 transition-colors border border-transparent"
              >
                <LogOut size={20} className="flex-shrink-0" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          </aside>

          {/* Conteúdo Principal */}
          <main className={`flex-1 ${activeSection === 'financeiro' ? 'relative overflow-hidden p-0' : 'overflow-y-auto'}`}>
            {activeSection === 'financeiro' ? (
              renderContent()
            ) : (
            <div className="container mx-auto px-4 py-8 max-w-7xl">
              {renderContent()}
            </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
