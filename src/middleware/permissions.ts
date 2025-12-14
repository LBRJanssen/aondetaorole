// ============================================
// MIDDLEWARE DE PERMISSÕES
// ============================================
// Middleware para proteger rotas administrativas

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hasPermission, Permission } from '@/utils/permissions';

// ============================================
// TIPOS
// ============================================

export interface PermissionConfig {
  permission: Permission | Permission[];
  requireAll?: boolean; // Se true, requer TODAS as permissões; se false, requer PELO MENOS UMA
  redirectTo?: string; // URL para redirecionar se não tiver permissão
}

// ============================================
// FUNÇÃO PRINCIPAL DO MIDDLEWARE
// ============================================

/**
 * Middleware para verificar permissões antes de acessar uma rota
 * 
 * @param request - Requisição do Next.js
 * @param config - Configuração de permissões necessárias
 * @returns NextResponse ou null se tiver permissão
 */
export async function requirePermission(
  request: NextRequest,
  config: PermissionConfig
): Promise<NextResponse | null> {
  try {
    // Obtém o usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Se não estiver autenticado, redireciona para login
    if (authError || !user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verifica permissões
    const permissions = Array.isArray(config.permission)
      ? config.permission
      : [config.permission];

    const requireAll = config.requireAll ?? false;

    let hasAccess = false;

    if (requireAll) {
      // Requer TODAS as permissões
      const results = await Promise.all(
        permissions.map((permission) => hasPermission(user.id, permission))
      );
      hasAccess = results.every((result) => result === true);
    } else {
      // Requer PELO MENOS UMA permissão
      const results = await Promise.all(
        permissions.map((permission) => hasPermission(user.id, permission))
      );
      hasAccess = results.some((result) => result === true);
    }

    // Se não tiver acesso, redireciona
    if (!hasAccess) {
      const redirectTo = config.redirectTo || '/';
      const redirectUrl = new URL(redirectTo, request.url);
      redirectUrl.searchParams.set('error', 'permission_denied');
      return NextResponse.redirect(redirectUrl);
    }

    // Se tiver permissão, retorna null (permite continuar)
    return null;
  } catch (error) {
    console.error('Erro no middleware de permissões:', error);
    // Em caso de erro, redireciona para home
    return NextResponse.redirect(new URL('/', request.url));
  }
}

// ============================================
// FUNÇÕES AUXILIARES PARA ROTAS ESPECÍFICAS
// ============================================

/**
 * Middleware para rotas administrativas (requer admin.dashboard)
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  return await requirePermission(request, {
    permission: 'admin.dashboard',
    redirectTo: '/',
  });
}

/**
 * Middleware para rotas de Owner (requer system.configure)
 */
export async function requireOwner(
  request: NextRequest
): Promise<NextResponse | null> {
  return await requirePermission(request, {
    permission: 'system.configure',
    redirectTo: '/',
  });
}

/**
 * Middleware para rotas de Moderação
 */
export async function requireModeration(
  request: NextRequest
): Promise<NextResponse | null> {
  return await requirePermission(request, {
    permission: ['moderation.view_reports', 'admin.dashboard'],
    requireAll: false, // Pelo menos uma das permissões
    redirectTo: '/',
  });
}

/**
 * Middleware para rotas de Suporte
 */
export async function requireSupport(
  request: NextRequest
): Promise<NextResponse | null> {
  return await requirePermission(request, {
    permission: ['support.view_tickets', 'admin.dashboard'],
    requireAll: false, // Pelo menos uma das permissões
    redirectTo: '/',
  });
}

