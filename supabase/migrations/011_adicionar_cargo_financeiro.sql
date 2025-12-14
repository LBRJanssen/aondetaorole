-- ============================================
-- MIGRAÇÃO: Adicionar Cargo Financeiro
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole este código > Run
--
-- Esta migração adiciona o cargo 'financeiro' ao sistema

-- ============================================
-- 1. Atualizar constraint de user_type
-- ============================================
-- Remove a constraint antiga
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_type_check;

-- Adiciona a nova constraint incluindo 'financeiro'
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_user_type_check 
CHECK (user_type IN ('common', 'premium', 'admin', 'owner', 'moderacao', 'suporte', 'financeiro'));

-- ============================================
-- 2. Atualizar função has_permission para incluir financeiro
-- ============================================
CREATE OR REPLACE FUNCTION public.has_permission(
  user_id UUID,
  permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Busca o user_type do usuário
  SELECT user_type INTO user_role
  FROM public.user_profiles
  WHERE id = user_id;
  
  -- Se usuário não existe, retorna false
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- OWNER tem todas as permissões
  IF user_role = 'owner' THEN
    RETURN TRUE;
  END IF;
  
  -- FINANCEIRO tem permissões financeiras completas
  IF user_role = 'financeiro' THEN
    RETURN permission IN (
      'financial.view_platform_wallet',
      'financial.manage_platform_wallet',
      'financial.view_all_transactions',
      'financial.export_financial_reports',
      'financial.withdraw_platform_funds',
      'admin.dashboard',
      'admin.stats'
    );
  END IF;
  
  -- ADMIN tem permissões administrativas (exceto gerenciar cargos e configurar sistema)
  IF user_role = 'admin' THEN
    RETURN permission IN (
      'events.view_all',
      'events.edit_any',
      'events.delete_any',
      'events.approve',
      'users.view_all',
      'users.edit_common_premium',
      'users.ban',
      'users.reset_password',
      'reports.view',
      'reports.export',
      'moderation.view_reports',
      'moderation.resolve_reports',
      'support.view_tickets',
      'support.manage_tickets',
      'admin.dashboard',
      'admin.stats'
    );
  END IF;
  
  -- MODERACAO tem permissões de moderação
  IF user_role = 'moderacao' THEN
    RETURN permission IN (
      'events.view_all',
      'events.approve',
      'moderation.view_reports',
      'moderation.resolve_reports',
      'moderation.export_reports',
      'moderation.stats',
      'admin.dashboard'
    );
  END IF;
  
  -- SUPORTE tem permissões de suporte
  IF user_role = 'suporte' THEN
    RETURN permission IN (
      'support.view_tickets',
      'support.create_tickets',
      'support.assign_tickets',
      'support.close_tickets',
      'support.prioritize_tickets',
      'support.view_transactions',
      'admin.dashboard'
    );
  END IF;
  
  -- PREMIUM tem permissões básicas premium
  IF user_role = 'premium' THEN
    RETURN permission IN (
      'events.create',
      'events.edit_own',
      'events.delete_own',
      'events.boost',
      'events.stats_own',
      'events.export_attendees',
      'profile.view_own',
      'profile.edit_own',
      'tickets.buy'
    );
  END IF;
  
  -- COMMON tem apenas permissões básicas
  IF user_role = 'common' THEN
    RETURN permission IN (
      'events.create',
      'events.edit_own',
      'events.delete_own',
      'profile.view_own',
      'profile.edit_own',
      'tickets.buy'
    );
  END IF;
  
  -- Se não encontrou nenhum cargo, retorna false
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Atualizar função is_financial_or_above
-- ============================================
CREATE OR REPLACE FUNCTION public.is_financial_or_above(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_id
    AND user_type IN ('owner', 'financeiro')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Comentário na coluna para documentação
-- ============================================
COMMENT ON COLUMN public.user_profiles.user_type IS 
'Tipos de usuário: common (comum), premium (premium), admin (administrador), owner (dono), moderacao (moderação), suporte (suporte), financeiro (financeiro)';

-- ============================================
-- 5. Verificar se tudo foi aplicado corretamente
-- ============================================
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'user_profiles_user_type_check';



