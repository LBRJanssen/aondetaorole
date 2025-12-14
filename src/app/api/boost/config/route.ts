import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Preços padrão (fallback)
const DEFAULT_CONFIG = [
  { boost_type: '12h', price: 0.20, duration_hours: 12, is_active: true },
  { boost_type: '24h', price: 0.40, duration_hours: 24, is_active: true }
];

// GET /api/boost/config - Ver configurações de preço dos boosts
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Boost] GET /config - Iniciando...');

    // Buscar configurações do banco
    const { data: configs, error } = await supabaseAdmin
      .from('boost_config')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    // Se não tiver no banco, usar padrão
    const boostConfigs = (configs && configs.length > 0) ? configs : DEFAULT_CONFIG;

    console.log('✅ [API Boost] Config:', boostConfigs.length, 'tipos');

    return NextResponse.json({
      success: true,
      data: {
        boosts: boostConfigs.map(c => ({
          type: c.boost_type,
          price: parseFloat(c.price),
          priceFormatted: `R$ ${parseFloat(c.price).toFixed(2).replace('.', ',')}`,
          durationHours: c.duration_hours,
          durationFormatted: `${c.duration_hours} horas`
        })),
        currency: 'BRL'
      }
    });

  } catch (error: any) {
    console.error('❌ [API Boost] Erro geral:', error);
    // Retornar config padrão em caso de erro
    return NextResponse.json({
      success: true,
      data: {
        boosts: DEFAULT_CONFIG.map(c => ({
          type: c.boost_type,
          price: c.price,
          priceFormatted: `R$ ${c.price.toFixed(2).replace('.', ',')}`,
          durationHours: c.duration_hours,
          durationFormatted: `${c.duration_hours} horas`
        })),
        currency: 'BRL'
      }
    });
  }
}

