-- ============================================
-- MIGRAÇÃO: Criar Usuário Sistema e Carteira da Plataforma
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole este código > Run
--
-- Esta migração cria:
-- 1. Um perfil em user_profiles para o usuário plataforma
-- 2. Uma carteira para a plataforma
--
-- CONFIGURAÇÃO:
-- UUID: b306fbee-4183-40f9-b351-8e1ef05bb61c
-- Email: platform@finance.com
-- Cargo: financeiro (tem acesso a todas as funcionalidades financeiras)

-- ============================================
-- CONFIGURAÇÃO: UUID e Email do usuário plataforma
-- ============================================
DO $$
DECLARE
  platform_user_id UUID := 'b306fbee-4183-40f9-b351-8e1ef05bb61c';
  platform_email TEXT := 'platform@finance.com';
BEGIN
  -- Verificar se o usuário existe no auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = platform_user_id) THEN
    RAISE EXCEPTION 'Usuário plataforma não encontrado no auth.users! Verifique se o UUID está correto: %', platform_user_id;
  END IF;
  
  -- ============================================
  -- 1. Criar perfil do usuário sistema (se não existir)
  -- ============================================
  INSERT INTO public.user_profiles (
    id,
    email,
    name,
    user_type,
    is_premium,
    created_at,
    updated_at
  )
  VALUES (
    platform_user_id,
    platform_email,
    'Sistema - Plataforma',
    'financeiro', -- Cargo financeiro para ter acesso às funcionalidades financeiras
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    user_type = 'financeiro', -- Garante que seja financeiro (não owner)
    email = EXCLUDED.email;
  
  -- ============================================
  -- 2. Criar carteira da plataforma (se não existir)
  -- ============================================
  INSERT INTO public.wallets (
    user_id,
    balance,
    total_deposited,
    total_withdrawn,
    created_at,
    updated_at
  )
  VALUES (
    platform_user_id,
    0.00, -- Saldo inicial zero
    0.00,
    0.00,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE '✅ Usuário sistema e carteira criados com sucesso!';
  RAISE NOTICE 'UUID do usuário: %', platform_user_id;
  RAISE NOTICE 'Email: %', platform_email;
  RAISE NOTICE 'Cargo: financeiro';
  
END $$;

-- ============================================
-- 3. Verificar se tudo foi criado corretamente
-- ============================================
SELECT 
  up.id,
  up.email,
  up.name,
  up.user_type,
  w.balance,
  w.total_deposited,
  w.total_withdrawn
FROM public.user_profiles up
LEFT JOIN public.wallets w ON w.user_id = up.id
WHERE up.id = 'b306fbee-4183-40f9-b351-8e1ef05bb61c';

-- Deve retornar:
-- id | email | name | user_type | balance | total_deposited | total_withdrawn
-- b306fbee-4183-40f9-b351-8e1ef05bb61c | platform@finance.com | Sistema - Plataforma | financeiro | 0.00 | 0.00 | 0.00

