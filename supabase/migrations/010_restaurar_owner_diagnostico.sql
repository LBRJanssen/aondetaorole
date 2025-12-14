-- ============================================
-- MIGRAÇÃO: Restaurar Owner - Diagnóstico Completo
-- ============================================
-- Execute este script passo a passo no SQL Editor do Supabase

-- ============================================
-- PASSO 1: LISTAR TODOS OS USUÁRIOS
-- ============================================
-- Execute esta query PRIMEIRO para ver todos os usuários
-- e identificar qual é o seu (procure pelo email ou nome)
SELECT 
  id,
  email,
  name,
  user_type,
  is_premium,
  premium_expires_at,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- ============================================
-- PASSO 2: VERIFICAR CONSTRAINT
-- ============================================
-- Verifica se 'owner' está permitido na constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND conname LIKE '%user_type%';

-- Se não mostrar 'owner' na lista, execute:
-- (Descomente as linhas abaixo se necessário)
/*
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_type_check;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_user_type_check 
CHECK (user_type IN ('common', 'premium', 'admin', 'owner', 'moderacao', 'suporte'));
*/

-- ============================================
-- PASSO 3: ATUALIZAR PELO EMAIL
-- ============================================
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email e execute:
UPDATE user_profiles
SET 
  user_type = 'owner',
  updated_at = NOW()
WHERE email = 'SEU_EMAIL_AQUI'
RETURNING id, email, name, user_type, is_premium;

-- ============================================
-- PASSO 4: SE NÃO FUNCIONAR, TENTAR PELO ID
-- ============================================
-- Use o ID que você viu no PASSO 1 (substitua 'SEU_ID_AQUI'):
/*
UPDATE user_profiles
SET 
  user_type = 'owner',
  updated_at = NOW()
WHERE id = 'SEU_ID_AQUI'::uuid
RETURNING id, email, name, user_type, is_premium;
*/

-- ============================================
-- PASSO 5: VERIFICAR SE ATUALIZOU
-- ============================================
-- Execute para confirmar que foi atualizado:
SELECT 
  id,
  email,
  name,
  user_type,
  is_premium,
  premium_expires_at,
  updated_at
FROM user_profiles
WHERE email = 'SEU_EMAIL_AQUI';
-- ou
-- WHERE id = 'SEU_ID_AQUI'::uuid;

-- Deve mostrar: user_type = 'owner'

-- ============================================
-- PASSO 6: SE AINDA NÃO FUNCIONAR - FORÇAR
-- ============================================
-- Se ainda não funcionar, pode ser RLS bloqueando
-- Tente esta query mais direta (substitua pelo seu email):
/*
UPDATE public.user_profiles
SET user_type = 'owner'
WHERE email = 'SEU_EMAIL_AQUI'
  AND (user_type != 'owner' OR user_type IS NULL);
*/

-- ============================================
-- PASSO 7: VERIFICAR RLS (Row Level Security)
-- ============================================
-- Se ainda não funcionar, verifique as políticas RLS:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Se houver políticas muito restritivas, pode precisar
-- desabilitar temporariamente RLS ou usar service_role



