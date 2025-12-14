-- ============================================
-- MIGRAÇÃO: Sistema Premium
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- TABELA: premium_plans (Planos disponíveis)
-- ============================================
CREATE TABLE IF NOT EXISTS premium_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  price_per_month DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  duration_months INTEGER NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  boost_discount_percent INTEGER DEFAULT 0, -- Desconto em boosts (10, 15, 20)
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir planos padrão (3 níveis com descontos escalonados em boosts)
INSERT INTO premium_plans (name, display_name, description, price_per_month, total_price, duration_months, discount_percent, boost_discount_percent, is_popular, sort_order) VALUES
  ('basic', 'Premium Básico', '10% OFF em boosts + benefícios essenciais', 29.90, 29.90, 1, 0, 10, false, 1),
  ('pro', 'Premium Pro', '15% OFF em boosts + todos os benefícios', 49.90, 49.90, 1, 0, 15, true, 2),
  ('max', 'Premium Max', '20% OFF em boosts + benefícios exclusivos', 79.90, 79.90, 1, 0, 20, false, 3)
ON CONFLICT (name) DO UPDATE SET
  price_per_month = EXCLUDED.price_per_month,
  total_price = EXCLUDED.total_price,
  discount_percent = EXCLUDED.discount_percent,
  boost_discount_percent = EXCLUDED.boost_discount_percent,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

-- ============================================
-- TABELA: premium_subscriptions (Assinaturas)
-- ============================================
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES premium_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('wallet', 'pix', 'credit_card')),
  amount_paid DECIMAL(10, 2) NOT NULL,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id),
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_user_id ON premium_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_status ON premium_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_expires_at ON premium_subscriptions(expires_at);

-- ============================================
-- TABELA: premium_benefits (Benefícios)
-- ============================================
CREATE TABLE IF NOT EXISTS premium_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO premium_benefits (name, description, icon, sort_order) VALUES
  ('Dashboard Completo', 'Painel exclusivo para gerenciar todos os seus eventos', 'layout-dashboard', 1),
  ('Lista de Convidados', 'Adicione e gerencie convidados pela plataforma', 'users', 2),
  ('Exportação de Dados', 'Exporte listas de convidados em PDF ou CSV', 'download', 3),
  ('Estatísticas Detalhadas', 'Visualize dados completos sobre seus eventos', 'bar-chart', 4),
  ('Visibilidade Premium', 'Seus eventos ganham destaque especial no mapa', 'star', 5),
  ('Suporte Prioritário', 'Atendimento exclusivo e rápido', 'headphones', 6),
  ('Eventos Ilimitados', 'Crie quantos eventos quiser', 'infinity', 7),
  ('Selo Verificado', 'Badge de organizador premium no perfil', 'badge-check', 8),
  ('Sem Anúncios', 'Experiência limpa sem propagandas', 'eye-off', 9),
  ('Boosts com Desconto', 'Desconto escalonado: Básico 10% | Pro 15% | Max 20%', 'zap', 10)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE premium_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view premium plans" ON premium_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view premium benefits" ON premium_benefits FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their own subscription" ON premium_subscriptions FOR SELECT USING (auth.uid() = user_id);

