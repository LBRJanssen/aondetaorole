-- ============================================
-- FUNÇÃO: has_permission
-- ============================================
-- Esta função verifica se um usuário tem uma permissão específica
-- baseada no seu cargo (user_type)
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- REMOVE FUNÇÃO ANTIGA (se existir)
-- ============================================
DROP FUNCTION IF EXISTS public.has_permission(UUID, TEXT);

-- ============================================
-- CRIA FUNÇÃO has_permission
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
  
  -- Verifica permissões baseadas no cargo
  -- OWNER tem todas as permissões
  IF user_role = 'owner' THEN
    RETURN TRUE;
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
      'events.edit_any',
      'events.hide',
      'events.approve',
      'users.view_all',
      'users.suspend_temporary',
      'users.add_warnings',
      'moderation.view_reports',
      'moderation.resolve_reports',
      'moderation.export_reports',
      'moderation.stats'
    );
  END IF;
  
  -- SUPORTE tem permissões limitadas
  IF user_role = 'suporte' THEN
    RETURN permission IN (
      'events.view_all',
      'events.view_status',
      'users.view_basic',
      'users.view_history',
      'support.view_tickets',
      'support.create_tickets',
      'support.assign_tickets',
      'support.close_tickets',
      'support.prioritize_tickets',
      'support.reset_password',
      'support.view_transactions',
      'knowledge.access',
      'knowledge.suggest_improvements',
      'knowledge.create_articles',
      'knowledge.update_faqs'
    );
  END IF;
  
  -- FINANCEIRO tem apenas permissões financeiras (NÃO pode banir usuários)
  IF user_role = 'financeiro' THEN
    RETURN permission IN (
      'financial.view_platform_wallet',
      'financial.manage_platform_wallet',
      'financial.view_all_transactions',
      'financial.export_financial_reports',
      'financial.withdraw_platform_funds'
    );
  END IF;
  
  -- PREMIUM tem permissões básicas + premium
  IF user_role = 'premium' THEN
    RETURN permission IN (
      'events.create',
      'events.edit_own',
      'events.delete_own',
      'events.boost',
      'events.stats_own',
      'events.export_attendees',
      'tickets.buy',
      'profile.view_own',
      'profile.edit_own'
    );
  END IF;
  
  -- COMMON tem apenas permissões básicas
  IF user_role = 'common' THEN
    RETURN permission IN (
      'events.create',
      'events.edit_own',
      'events.delete_own',
      'events.boost',
      'tickets.buy',
      'profile.view_own',
      'profile.edit_own'
    );
  END IF;
  
  -- Se não for nenhum cargo conhecido, retorna false
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÁRIO DA FUNÇÃO
-- ============================================
COMMENT ON FUNCTION public.has_permission(UUID, TEXT) IS 
'Verifica se um usuário tem uma permissão específica baseada no seu cargo. Retorna TRUE se o usuário tem a permissão, FALSE caso contrário.';

-- ============================================
-- TESTE DA FUNÇÃO (opcional - pode remover depois)
-- ============================================
-- Exemplo de uso:
-- SELECT public.has_permission('uuid-do-usuario', 'events.edit_any');
-- SELECT public.has_permission(auth.uid(), 'admin.dashboard');

