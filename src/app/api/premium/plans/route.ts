import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Planos padrão (fallback)
const DEFAULT_PLANS = [
  { name: 'basic', display_name: 'Premium Básico', description: '10% OFF em boosts + benefícios essenciais', price_per_month: 29.90, total_price: 29.90, duration_months: 1, discount_percent: 0, boost_discount_percent: 10, is_popular: false },
  { name: 'pro', display_name: 'Premium Pro', description: '15% OFF em boosts + todos os benefícios', price_per_month: 49.90, total_price: 49.90, duration_months: 1, discount_percent: 0, boost_discount_percent: 15, is_popular: true },
  { name: 'max', display_name: 'Premium Max', description: '20% OFF em boosts + benefícios exclusivos', price_per_month: 79.90, total_price: 79.90, duration_months: 1, discount_percent: 0, boost_discount_percent: 20, is_popular: false }
];

const DEFAULT_BENEFITS = [
  { name: 'Dashboard Completo', description: 'Painel exclusivo para gerenciar todos os seus eventos', icon: 'layout-dashboard' },
  { name: 'Lista de Convidados', description: 'Adicione e gerencie convidados pela plataforma', icon: 'users' },
  { name: 'Exportação de Dados', description: 'Exporte listas de convidados em PDF ou CSV', icon: 'download' },
  { name: 'Estatísticas Detalhadas', description: 'Visualize dados completos sobre seus eventos', icon: 'bar-chart' },
  { name: 'Visibilidade Premium', description: 'Seus eventos ganham destaque especial no mapa', icon: 'star' },
  { name: 'Suporte Prioritário', description: 'Atendimento exclusivo e rápido', icon: 'headphones' },
  { name: 'Eventos Ilimitados', description: 'Crie quantos eventos quiser', icon: 'infinity' },
  { name: 'Selo Verificado', description: 'Badge de organizador premium no perfil', icon: 'badge-check' },
  { name: 'Sem Anúncios', description: 'Experiência limpa sem propagandas', icon: 'eye-off' },
  { name: 'Boosts com Desconto', description: '20% de desconto em todos os boosts', icon: 'zap' }
];

// GET /api/premium/plans - Listar planos e benefícios
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Premium] GET /plans - Iniciando...');

    // 1. Buscar planos (sem cache)
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('premium_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (plansError) {
      console.error('❌ [API Premium] Erro ao buscar planos:', plansError);
    } else {
      console.log('📊 [API Premium] Planos encontrados:', plans?.map(p => ({ name: p.name, discount: p.boost_discount_percent })));
    }

    // 2. Buscar benefícios
    const { data: benefits } = await supabaseAdmin
      .from('premium_benefits')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Usar padrão se não tiver no banco
    let finalPlans = (plans && plans.length > 0) ? plans : DEFAULT_PLANS;
    
    // Garantir que os valores de boost_discount_percent estejam corretos
    // Se o banco tiver valores antigos, usar os valores padrão corretos
    finalPlans = finalPlans.map(plan => {
      const defaultPlan = DEFAULT_PLANS.find(p => p.name === plan.name);
      if (defaultPlan && plan.boost_discount_percent !== defaultPlan.boost_discount_percent) {
        console.log(`⚠️ [API Premium] Corrigindo desconto do plano ${plan.name}: ${plan.boost_discount_percent}% → ${defaultPlan.boost_discount_percent}%`);
        return {
          ...plan,
          boost_discount_percent: defaultPlan.boost_discount_percent,
          description: defaultPlan.description || plan.description
        };
      }
      return plan;
    });
    
    const finalBenefits = (benefits && benefits.length > 0) ? benefits : DEFAULT_BENEFITS;

    console.log('✅ [API Premium] Planos:', finalPlans.length, '| Benefícios:', finalBenefits.length);

    return NextResponse.json({
      success: true,
      data: {
        plans: finalPlans.map(p => ({
          id: p.id || p.name,
          name: p.name,
          displayName: p.display_name,
          description: p.description,
          pricePerMonth: parseFloat(p.price_per_month),
          pricePerMonthFormatted: `R$ ${parseFloat(p.price_per_month).toFixed(2).replace('.', ',')}`,
          totalPrice: parseFloat(p.total_price),
          totalPriceFormatted: `R$ ${parseFloat(p.total_price).toFixed(2).replace('.', ',')}`,
          durationMonths: p.duration_months,
          discountPercent: p.discount_percent,
          boostDiscountPercent: p.boost_discount_percent || 0,
          isPopular: p.is_popular
        })),
        benefits: finalBenefits.map(b => ({
          name: b.name,
          description: b.description,
          icon: b.icon
        })),
        currency: 'BRL'
      }
    });

  } catch (error: any) {
    console.error('❌ [API Premium] Erro:', error);
    // Retornar padrão em caso de erro
    return NextResponse.json({
      success: true,
      data: {
        plans: DEFAULT_PLANS.map(p => ({
          id: p.name,
          name: p.name,
          displayName: p.display_name,
          description: p.description,
          pricePerMonth: p.price_per_month,
          pricePerMonthFormatted: `R$ ${p.price_per_month.toFixed(2).replace('.', ',')}`,
          totalPrice: p.total_price,
          totalPriceFormatted: `R$ ${p.total_price.toFixed(2).replace('.', ',')}`,
          durationMonths: p.duration_months,
          discountPercent: p.discount_percent,
          boostDiscountPercent: p.boost_discount_percent || 0,
          isPopular: p.is_popular
        })),
        benefits: DEFAULT_BENEFITS,
        currency: 'BRL'
      }
    });
  }
}

