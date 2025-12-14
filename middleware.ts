// ============================================
// MIDDLEWARE DO NEXT.JS - SISTEMA DE PERMISSÕES
// ============================================
// Este middleware protege rotas administrativas baseado em permissões
// O Next.js usa este arquivo automaticamente

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  requireAdmin,
  requireOwner,
  requireModeration,
  requireSupport,
  requirePermission,
} from '@/middleware/permissions';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // ROTAS ADMINISTRATIVAS
  // ============================================
  // Protege todas as rotas /admin/* (exceto /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const response = await requireAdmin(request);
    if (response) {
      return response; // Redireciona se não tiver permissão
    }
  }

  // ============================================
  // ROTAS DE OWNER
  // ============================================
  // Protege rotas de configuração do sistema (apenas Owner)
  if (pathname.startsWith('/admin/system') || pathname.startsWith('/admin/settings')) {
    const response = await requireOwner(request);
    if (response) {
      return response;
    }
  }

  // ============================================
  // ROTAS DE MODERAÇÃO
  // ============================================
  // Protege rotas de moderação
  if (pathname.startsWith('/admin/moderation')) {
    const response = await requireModeration(request);
    if (response) {
      return response;
    }
  }

  // ============================================
  // ROTAS DE SUPORTE
  // ============================================
  // Protege rotas de suporte
  if (pathname.startsWith('/admin/support')) {
    const response = await requireSupport(request);
    if (response) {
      return response;
    }
  }

  // ============================================
  // ROTAS COM PERMISSÕES ESPECÍFICAS
  // ============================================
  // Rota de usuários requer permissão específica
  if (pathname.startsWith('/admin/users')) {
    const response = await requirePermission(request, {
      permission: 'users.view_all',
      redirectTo: '/admin',
    });
    if (response) {
      return response;
    }
  }

  // Permite continuar se passou em todas as verificações
  return NextResponse.next();
}

// ============================================
// CONFIGURAÇÃO DO MIDDLEWARE
// ============================================
// Define quais rotas o middleware deve processar
export const config = {
  matcher: [
    // Aplica middleware em todas as rotas /admin/* (exceto arquivos estáticos)
    '/admin/:path*',
  ],
};

