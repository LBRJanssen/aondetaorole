// ============================================
// SISTEMA DE PERMISSÕES - AONDE TÁ O ROLE
// ============================================
// Utilitários para verificar permissões de usuários

import { supabase } from '@/lib/supabase';

// ============================================
// TIPOS DE PERMISSÕES
// ============================================

export type Permission =
  // Eventos
  | 'events.create'
  | 'events.edit_own'
  | 'events.edit_any'
  | 'events.delete_own'
  | 'events.delete_any'
  | 'events.hide'
  | 'events.view_all'
  | 'events.view_status'
  | 'events.approve'
  | 'events.boost'
  | 'events.stats_own'
  | 'events.export_attendees'
  // Usuários
  | 'users.view_all'
  | 'users.view_basic'
  | 'users.view_history'
  | 'users.edit_common_premium'
  | 'users.ban'
  | 'users.suspend_temporary'
  | 'users.add_warnings'
  | 'users.reset_password'
  // Moderação
  | 'moderation.view_reports'
  | 'moderation.resolve_reports'
  | 'moderation.export_reports'
  | 'moderation.stats'
  // Suporte
  | 'support.view_tickets'
  | 'support.create_tickets'
  | 'support.assign_tickets'
  | 'support.close_tickets'
  | 'support.prioritize_tickets'
  | 'support.view_transactions'
  // Base de Conhecimento
  | 'knowledge.access'
  | 'knowledge.suggest_improvements'
  | 'knowledge.create_articles'
  | 'knowledge.update_faqs'
  // Admin
  | 'admin.dashboard'
  | 'admin.stats'
  // Financeiro
  | 'financial.view_platform_wallet'
  | 'financial.manage_platform_wallet'
  | 'financial.view_all_transactions'
  | 'financial.export_financial_reports'
  | 'financial.withdraw_platform_funds'
  // Sistema (apenas Owner)
  | 'system.configure'
  | 'system.manage_roles'
  | 'system.view_logs'
  // Perfil
  | 'profile.view_own'
  | 'profile.edit_own'
  // Tickets/Ingressos
  | 'tickets.buy';

// ============================================
// TIPOS DE USUÁRIO
// ============================================

export type UserRole = 'common' | 'premium' | 'admin' | 'owner' | 'moderacao' | 'suporte' | 'financeiro';

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Verifica se um usuário tem uma permissão específica
 * Usa a função has_permission do Supabase
 */
export async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_permission', {
      user_id: userId,
      permission: permission,
    });

    if (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    return false;
  }
}

/**
 * Verifica se o usuário atual (autenticado) tem uma permissão
 */
export async function hasCurrentUserPermission(
  permission: Permission
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    return await hasPermission(user.id, permission);
  } catch (error) {
    console.error('Erro ao verificar permissão do usuário atual:', error);
    return false;
  }
}

/**
 * Verifica múltiplas permissões (retorna true se tiver TODAS)
 */
export async function hasAllPermissions(
  userId: string,
  permissions: Permission[]
): Promise<boolean> {
  const results = await Promise.all(
    permissions.map((permission) => hasPermission(userId, permission))
  );
  return results.every((result) => result === true);
}

/**
 * Verifica múltiplas permissões (retorna true se tiver PELO MENOS UMA)
 */
export async function hasAnyPermission(
  userId: string,
  permissions: Permission[]
): Promise<boolean> {
  const results = await Promise.all(
    permissions.map((permission) => hasPermission(userId, permission))
  );
  return results.some((result) => result === true);
}

/**
 * Verifica se um usuário tem um cargo específico
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.user_type === role;
  } catch (error) {
    console.error('Erro ao verificar cargo:', error);
    return false;
  }
}

/**
 * Verifica se o usuário atual tem um cargo específico
 */
export async function hasCurrentUserRole(role: UserRole): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    return await hasRole(user.id, role);
  } catch (error) {
    console.error('Erro ao verificar cargo do usuário atual:', error);
    return false;
  }
}

/**
 * Verifica se um usuário é administrador (admin ou owner)
 */
export async function isAdministrator(userId: string): Promise<boolean> {
  const isAdmin = await hasRole(userId, 'admin');
  const isOwner = await hasRole(userId, 'owner');
  return isAdmin || isOwner;
}

/**
 * Verifica se o usuário atual é administrador
 */
export async function isCurrentUserAdministrator(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    return await isAdministrator(user.id);
  } catch (error) {
    console.error('Erro ao verificar se usuário é administrador:', error);
    return false;
  }
}

/**
 * Obtém o cargo (role) de um usuário
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.user_type as UserRole;
  } catch (error) {
    console.error('Erro ao obter cargo do usuário:', error);
    return null;
  }
}

/**
 * Obtém o cargo do usuário atual
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return await getUserRole(user.id);
  } catch (error) {
    console.error('Erro ao obter cargo do usuário atual:', error);
    return null;
  }
}

