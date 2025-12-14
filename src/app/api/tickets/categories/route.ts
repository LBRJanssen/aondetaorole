import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Categorias padrão (fallback)
const DEFAULT_CATEGORIES = [
  { name: 'Problema técnico', description: 'Bugs, erros e problemas no site/app', icon: 'bug' },
  { name: 'Pagamento', description: 'Dúvidas sobre pagamentos, reembolsos e carteira', icon: 'credit-card' },
  { name: 'Conta', description: 'Problemas com login, senha ou dados da conta', icon: 'user' },
  { name: 'Evento', description: 'Dúvidas ou problemas com eventos', icon: 'calendar' },
  { name: 'Denúncia', description: 'Denunciar evento ou usuário', icon: 'flag' },
  { name: 'Premium', description: 'Dúvidas sobre assinatura premium', icon: 'crown' },
  { name: 'Sugestão', description: 'Sugestões de melhorias', icon: 'lightbulb' },
  { name: 'Outro', description: 'Outros assuntos', icon: 'help-circle' }
];

// GET /api/tickets/categories - Listar categorias de ticket
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API Tickets] GET /categories');

    // Buscar categorias do banco
    const { data: categories, error } = await supabaseAdmin
      .from('ticket_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Usar padrão se não tiver no banco
    const finalCategories = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;

    console.log('✅ [API Tickets] Categorias:', finalCategories.length);

    return NextResponse.json({
      success: true,
      data: {
        categories: finalCategories.map(c => ({
          id: c.id || c.name,
          name: c.name,
          description: c.description,
          icon: c.icon
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ [API Tickets] Erro:', error);
    // Retornar padrão em caso de erro
    return NextResponse.json({
      success: true,
      data: {
        categories: DEFAULT_CATEGORIES.map(c => ({
          id: c.name,
          name: c.name,
          description: c.description,
          icon: c.icon
        }))
      }
    });
  }
}

