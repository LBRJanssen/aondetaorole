-- ============================================
-- MIGRAÇÃO: Atualizar Descontos de Boost
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole este código > Run
--
-- Esta migração atualiza os descontos de boost nos planos premium:
-- - Premium Básico: 15% → 10%
-- - Premium Pro: 25% → 15%
-- - Premium Max: 35% → 20%

-- ============================================
-- 1. Atualizar descontos nos planos
-- ============================================
UPDATE premium_plans 
SET 
  boost_discount_percent = CASE 
    WHEN name = 'basic' THEN 10
    WHEN name = 'pro' THEN 15
    WHEN name = 'max' THEN 20
    ELSE boost_discount_percent
  END,
  description = CASE 
    WHEN name = 'basic' THEN '10% OFF em boosts + benefícios essenciais'
    WHEN name = 'pro' THEN '15% OFF em boosts + todos os benefícios'
    WHEN name = 'max' THEN '20% OFF em boosts + benefícios exclusivos'
    ELSE description
  END
WHERE name IN ('basic', 'pro', 'max');

-- ============================================
-- 2. Atualizar benefício de boosts com desconto
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
-- 3. Verificar se tudo foi aplicado corretamente
-- ============================================
SELECT 
  name,
  display_name,
  boost_discount_percent,
  description,
  price_per_month,
  is_popular
FROM premium_plans
WHERE name IN ('basic', 'pro', 'max')
ORDER BY sort_order;

-- Deve retornar:
-- basic | Premium Básico | 10 | 10% OFF em boosts + benefícios essenciais | 29.90 | false
-- pro   | Premium Pro    | 15 | 15% OFF em boosts + todos os benefícios   | 49.90 | true
-- max   | Premium Max    | 20 | 20% OFF em boosts + benefícios exclusivos | 79.90 | false



