-- ============================================
-- MIGRAÇÃO: Desativar Planos Premium Antigos
-- ============================================
-- Execute este script se você já executou a migração 006
-- e quer apenas desativar os planos antigos (monthly, quarterly, yearly)
--
-- Este script desativa os planos antigos que não têm desconto em boosts,
-- mantendo apenas os novos planos com descontos escalonados

-- ============================================
-- Desativar planos antigos
-- ============================================
UPDATE premium_plans 
SET is_active = false
WHERE name IN ('monthly', 'quarterly', 'yearly')
  AND is_active = true;

-- ============================================
-- Verificar resultado
-- ============================================
SELECT 
  name,
  display_name,
  boost_discount_percent,
  price_per_month,
  is_active,
  is_popular
FROM premium_plans
ORDER BY 
  CASE 
    WHEN is_active = true THEN 0 
    ELSE 1 
  END,
  sort_order;

-- Deve mostrar:
-- Planos ATIVOS (is_active = true):
--   basic | Premium Básico | 15 | 29.90 | true  | false
--   pro   | Premium Pro    | 25 | 49.90 | true  | true
--   max   | Premium Max    | 35 | 79.90 | true  | false
--
-- Planos DESATIVADOS (is_active = false):
--   monthly   | Mensal    | 0 | 29.90 | false | false
--   quarterly | Trimestral| 0 | 24.90 | false | true
--   yearly    | Anual     | 0 | 19.90 | false | false



