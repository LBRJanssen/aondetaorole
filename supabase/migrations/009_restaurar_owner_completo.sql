-- ============================================
-- MIGRAÇÃO: Restaurar Cargo Owner (Versão Completa)
-- ============================================
-- Execute este script no SQL Editor do Supabase
--
-- Este script:
-- 1. Lista todos os usuários para você identificar qual é o seu
-- 2. Restaura o cargo de owner pelo email OU pelo ID
-- 3. Verifica se foi atualizado corretamente

-- ============================================
-- PASSO 1: Listar todos os usuários (para identificar)
-- ============================================
-- Execute esta query primeiro para ver todos os usuários:
SELECT 
  id,
  email,
  name,
  user_type,
  is_premium,
  premium_expires_at,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- PASSO 2: Restaurar owner pelo EMAIL
-- ============================================
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email e execute:
/*
UPDATE user_profiles
SET user_type = 'owner'
WHERE email = 'SEU_EMAIL_AQUI';
*/

-- ============================================
-- PASSO 3: OU restaurar owner pelo ID
-- ============================================
-- Se preferir usar o ID (mais seguro), substitua 'SEU_ID_AQUI' pelo seu ID:
/*
UPDATE user_profiles
SET user_type = 'owner'
WHERE id = 'SEU_ID_AQUI'::uuid;
*/

-- ============================================
-- PASSO 4: Verificar se foi atualizado
-- ============================================
-- Execute após atualizar para confirmar:
/*
SELECT 
  id,
  email,
  name,
  user_type,
  is_premium,
  premium_expires_at
FROM user_profiles
WHERE email = 'SEU_EMAIL_AQUI';
-- ou
WHERE id = 'SEU_ID_AQUI'::uuid;
*/

-- ============================================
-- PASSO 5: Se ainda não funcionar, forçar atualização
-- ============================================
-- Use esta query se a anterior não funcionar (substitua pelo seu email):
/*
UPDATE user_profiles
SET 
  user_type = 'owner',
  updated_at = NOW()
WHERE email = 'SEU_EMAIL_AQUI'
RETURNING id, email, name, user_type;
*/

-- ============================================
-- PASSO 6: Verificar constraint (se houver erro)
-- ============================================
-- Se der erro de constraint, verifique se 'owner' está permitido:
/*
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND conname LIKE '%user_type%';
*/



