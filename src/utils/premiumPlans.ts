// ============================================
// CONFIGURAÇÃO DE BENEFÍCIOS POR PLANO
// ============================================

export type PlanName = 'basic' | 'pro' | 'max';
export type BenefitAccess = 'full' | 'partial' | 'limited' | 'none';

export interface BenefitConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  basic: BenefitAccess | { type: BenefitAccess; description: string };
  pro: BenefitAccess | { type: BenefitAccess; description: string };
  max: BenefitAccess | { type: BenefitAccess; description: string };
}

export const PLAN_BENEFITS: BenefitConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard Completo',
    description: 'Painel exclusivo para gerenciar todos os seus eventos',
    icon: 'layout-dashboard',
    basic: 'full',
    pro: 'full',
    max: 'full',
  },
  {
    id: 'guest-list',
    name: 'Lista de Convidados',
    description: 'Adicione e gerencie convidados pela plataforma',
    icon: 'users',
    basic: 'full',
    pro: 'full',
    max: 'full',
  },
  {
    id: 'data-export',
    name: 'Exportação de Dados',
    description: 'Exporte listas de convidados em PDF ou CSV',
    icon: 'download',
    basic: { type: 'partial', description: 'Exportação simples' },
    pro: 'full',
    max: 'full',
  },
  {
    id: 'statistics',
    name: 'Estatísticas Detalhadas',
    description: 'Visualize dados completos sobre seus eventos',
    icon: 'bar-chart',
    basic: { type: 'none', description: 'Estatísticas básicas' },
    pro: 'full',
    max: 'full',
  },
  {
    id: 'visibility',
    name: 'Visibilidade Premium',
    description: 'Seus eventos ganham destaque especial no mapa',
    icon: 'star',
    basic: 'none',
    pro: { type: 'limited', description: 'Visibilidade limitada' },
    max: { type: 'limited', description: '2x mais visível' },
  },
  {
    id: 'support',
    name: 'Suporte Prioritário',
    description: 'Atendimento exclusivo e rápido',
    icon: 'headphones',
    basic: 'full',
    pro: 'full',
    max: 'full',
  },
  {
    id: 'unlimited-events',
    name: 'Eventos Ilimitados',
    description: 'Crie quantos eventos quiser',
    icon: 'infinity',
    basic: 'full',
    pro: 'full',
    max: 'full',
  },
  {
    id: 'verified-badge',
    name: 'Selo Verificado',
    description: 'Badge de organizador premium no perfil',
    icon: 'badge-check',
    basic: 'none',
    pro: 'none',
    max: 'full',
  },
  {
    id: 'no-ads',
    name: 'Sem Anúncios',
    description: 'Experiência limpa sem propagandas',
    icon: 'eye-off',
    basic: 'full',
    pro: 'full',
    max: 'full',
  },
  {
    id: 'boost-discount',
    name: 'Boosts com Desconto',
    description: 'Desconto escalonado em boosts',
    icon: 'zap',
    basic: 'full',
    pro: 'full',
    max: 'full',
  },
];

// Função para obter acesso de um benefício em um plano
export function getBenefitAccess(benefit: BenefitConfig, plan: PlanName): BenefitAccess {
  const access = benefit[plan];
  if (typeof access === 'string') {
    return access;
  }
  return access.type;
}

// Função para obter descrição do acesso
export function getBenefitDescription(benefit: BenefitConfig, plan: PlanName): string {
  const access = benefit[plan];
  if (typeof access === 'string') {
    return '';
  }
  return access.description;
}

// Função para obter label do acesso
export function getAccessLabel(access: BenefitAccess): string {
  const labels: Record<BenefitAccess, string> = {
    full: 'Incluído',
    partial: 'Parcial',
    limited: 'Limitado',
    none: 'Não incluído',
  };
  return labels[access];
}

// Função para verificar se um plano tem acesso a um benefício
export function hasAccess(benefit: BenefitConfig, plan: PlanName): boolean {
  return getBenefitAccess(benefit, plan) !== 'none';
}

