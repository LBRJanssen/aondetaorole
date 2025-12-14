// ============================================
// SUPABASE CLIENT - Configuracao do Banco de Dados
// ============================================
// IMPORTANTE: Este arquivo NÃO deve ser deletado ou modificado automaticamente
// Se este arquivo estiver vazio, recrie-o com este conteúdo

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANTE: Substitua estas variaveis pelas suas credenciais do Supabase
// Voce pode obter em: https://supabase.com/dashboard
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verifica se está configurado (apenas no servidor/build time)
if (typeof window === 'undefined') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '⚠️ Supabase nao configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local'
    );
  } else {
  }
}

// Cliente Supabase para uso no cliente (browser)
// Só cria o cliente se as variáveis estiverem configuradas
let supabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '') {
  try {
    console.log('🔧 [Supabase] Criando cliente Supabase...', {
      url: supabaseUrl.substring(0, 30) + '...',
      hasKey: !!supabaseAnonKey,
    });
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    console.log('✅ [Supabase] Cliente Supabase criado com sucesso');
  } catch (error) {
    console.error('❌ [Supabase] Erro ao criar cliente Supabase:', error);
  }
} else {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ [Supabase] Cliente Supabase não criado: variáveis de ambiente não configuradas', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    });
  }
}

export const supabase = supabaseClient;

// Tipos do banco de dados
export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          address: string;
          coordinates: { lat: number; lng: number };
          max_capacity: number;
          current_attendees: number;
          age_range: { min: number; max?: number };
          event_type: string;
          cover_image: string;
          is_free: boolean;
          price: number | null;
          ticket_categories: any[] | null;
          boosts: number;
          organizer_id: string;
          organizer_name: string;
          is_premium_organizer: boolean;
          start_date: string;
          end_date: string | null;
          created_at: string;
          updated_at: string;
          is_active: boolean;
          is_approved: boolean;
          views: number;
          interested_count: number;
          going_count: number;
          on_the_way_count: number;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      ticket_categories: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          price: number;
          stock_total: number;
          stock_remaining: number;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ticket_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ticket_categories']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'deposit' | 'purchase' | 'refund';
          amount: number;
          description: string;
          event_id: string | null;
          event_name: string | null;
          ticket_category_id: string | null;
          ticket_category_name: string | null;
          status: 'completed' | 'pending' | 'failed';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      user_event_interactions: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          status: 'interested' | 'going' | 'on_the_way';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_event_interactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_event_interactions']['Insert']>;
      };
    };
  };
};

