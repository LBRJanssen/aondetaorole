-- ============================================
-- MIGRAÇÃO: Adicionar boost_discount_percent ao Premium
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole este código > Run
--
-- Esta migração adiciona a coluna boost_discount_percent à tabela premium_plans
-- e atualiza os planos existentes com os descontos escalonados

-- ============================================
-- 1. Adicionar coluna boost_discount_percent (se não existir)
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'premium_plans' 
    AND column_name = 'boost_discount_percent'
  ) THEN
    ALTER TABLE premium_plans 
    ADD COLUMN boost_discount_percent INTEGER DEFAULT 0;
    
    RAISE NOTICE 'Coluna boost_discount_percent adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna boost_discount_percent já existe';
  END IF;
END $$;

-- ============================================
-- 2. Desativar planos antigos (monthly, quarterly, yearly)
-- ============================================
-- Desativar planos antigos que não têm desconto em boosts
UPDATE premium_plans 
SET is_active = false
WHERE name IN ('monthly', 'quarterly', 'yearly');

-- ============================================
-- 3. Atualizar planos existentes com descontos escalonados
-- ============================================
-- Atualizar ou inserir planos premium com descontos em boosts
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
  description = EXCLUDED.description,
  is_popular = EXCLUDED.is_popular,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- ============================================
-- 4. Atualizar benefício de boosts com desconto
-- ============================================
UPDATE premium_benefits 
SET description = 'Desconto escalonado: Básico 10% | Pro 15% | Max 20%'
WHERE name = 'Boosts com Desconto';

-- Se o benefício não existir, criar
INSERT INTO premium_benefits (name, description, icon, sort_order)
VALUES ('Boosts com Desconto', 'Desconto escalonado: Básico 10% | Pro 15% | Max 20%', 'zap', 10)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;

-- ============================================
-- 5. Verificar se tudo foi aplicado corretamente
-- ============================================
SELECT 
  name,
  display_name,
  boost_discount_percent,
  price_per_month,
  is_popular
FROM premium_plans
WHERE is_active = true
ORDER BY sort_order;

-- Deve retornar apenas 3 planos ativos:
-- basic | Premium Básico | 10 | 29.90 | false
-- pro   | Premium Pro    | 15 | 49.90 | true
-- max   | Premium Max    | 20 | 79.90 | false
--
-- Os planos antigos (monthly, quarterly, yearly) estarão desativados (is_active = false)

