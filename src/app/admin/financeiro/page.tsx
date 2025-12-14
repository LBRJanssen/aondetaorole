'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import AdminFinanceiro from '@/components/Admin/AdminFinanceiro';
import { Shield } from 'lucide-react';

export default function FinanceiroPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { checkHasFinancialAccess, isLoading: permissionsLoading, userRole } = usePermissions();

  useEffect(() => {
    if (!permissionsLoading && !isAuthenticated) {
      router.push('/login?redirect=/admin/financeiro');
      return;
    }

    if (!permissionsLoading && isAuthenticated) {
      const hasAccess = checkHasFinancialAccess();
      
      if (!hasAccess) {
        console.log('❌ [Financeiro] Sem permissão para acessar. User:', user?.userType, '| Role:', userRole);
        router.push('/home');
        return;
      }
      
      console.log('✅ [Financeiro] Acesso permitido. User:', user?.userType, '| Role:', userRole);
    }
  }, [isAuthenticated, permissionsLoading, checkHasFinancialAccess, router, user, userRole]);

  if (permissionsLoading || !isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield size={48} className="mx-auto text-gray-500 mb-4 animate-pulse" />
            <p className="text-gray-400">Verificando permissões...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Verificar acesso novamente antes de renderizar
  if (!checkHasFinancialAccess()) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield size={48} className="mx-auto text-red-500 mb-4" />
            <p className="text-gray-400">Acesso negado. Apenas Owner e Financeiro podem acessar.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-dark-900 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <AdminFinanceiro />
        </div>
      </div>
    </Layout>
  );
}



