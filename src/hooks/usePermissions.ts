// ============================================
// HOOK: usePermissions
// ============================================
// Hook React para verificar permissões de usuários

import { useState, useEffect } from 'react';
import {
  hasPermission,
  hasCurrentUserPermission,
  hasRole,
  hasCurrentUserRole,
  isAdministrator,
  isCurrentUserAdministrator,
  getUserRole,
  getCurrentUserRole,
  Permission,
  UserRole,
} from '@/utils/permissions';
import { supabase } from '@/lib/supabase';

// ============================================
// HOOK PRINCIPAL
// ============================================

export function usePermissions() {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserInfo();
    
    // Escuta mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserInfo();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserInfo = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setUserRole(null);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      const role = await getCurrentUserRole();
      setUserRole(role);
      setIsAdmin(await isCurrentUserAdministrator());
    } catch (error) {
      console.error('Erro ao carregar informações do usuário:', error);
      setUserId(null);
      setUserRole(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verifica se o usuário atual tem uma permissão
   */
  const checkPermission = async (permission: Permission): Promise<boolean> => {
    if (!userId) return false;
    return await hasPermission(userId, permission);
  };

  /**
   * Verifica se o usuário atual tem um cargo
   */
  const checkRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  /**
   * Verifica se o usuário atual é administrador
   */
  const checkIsAdmin = (): boolean => {
    return isAdmin;
  };

  /**
   * Verifica se o usuário atual é Owner
   */
  const checkIsOwner = (): boolean => {
    return userRole === 'owner';
  };

  /**
   * Verifica se o usuário atual é Moderação
   */
  const checkIsModeration = (): boolean => {
    return userRole === 'moderacao';
  };

  /**
   * Verifica se o usuário atual é Suporte
   */
  const checkIsSupport = (): boolean => {
    return userRole === 'suporte';
  };

  /**
   * Verifica se o usuário atual é Financeiro
   */
  const checkIsFinancial = (): boolean => {
    return userRole === 'financeiro';
  };

  /**
   * Verifica se o usuário atual tem acesso financeiro (Owner ou Financeiro)
   */
  const checkHasFinancialAccess = (): boolean => {
    return userRole === 'owner' || userRole === 'financeiro';
  };

  return {
    // Estado
    isLoading,
    userRole,
    isAdmin,
    userId,
    // Funções de verificação
    checkPermission,
    checkRole,
    checkIsAdmin,
    checkIsOwner,
    checkIsModeration,
    checkIsSupport,
    checkIsFinancial,
    checkHasFinancialAccess,
    // Funções auxiliares
    hasPermission: checkPermission,
    hasRole: checkRole,
    isAdministrator: checkIsAdmin,
    isOwner: checkIsOwner,
    isModeration: checkIsModeration,
    isSupport: checkIsSupport,
    isFinancial: checkIsFinancial,
    hasFinancialAccess: checkHasFinancialAccess,
  };
}

// ============================================
// HOOK SIMPLIFICADO PARA PERMISSÃO ESPECÍFICA
// ============================================

export function usePermission(permission: Permission) {
  const { checkPermission, isLoading } = usePermissions();
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      checkPermission(permission).then(setHasPermission);
    }
  }, [permission, isLoading, checkPermission]);

  return hasPermission;
}

// ============================================
// HOOK PARA VERIFICAR CARGO
// ============================================

export function useRole(role: UserRole) {
  const { checkRole } = usePermissions();
  return checkRole(role);
}

