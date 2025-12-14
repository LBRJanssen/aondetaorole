'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuthStore } from '@/store/authStore';
import { ConfirmModal } from '@/components/UI/ConfirmModal';
import { getErrorMessage } from '@/utils/errorMessages';
import { Users, Search, Loader, AlertCircle, Shield, ShieldCheck, Crown, User, Edit, Save, X, Loader2, Sparkles, Headphones, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  user_type: 'common' | 'premium' | 'admin' | 'owner' | 'moderacao' | 'suporte';
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminUsers() {
  const { showToast } = useToast();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Verifica se o usuário logado pode editar emails/senhas (apenas owner e admin)
  const isOwner = currentUser?.userType === 'owner';
  const isAdmin = currentUser?.userType === 'admin';
  const canEditCredentials = isOwner || isAdmin;
  
  // Função para verificar se pode editar um usuário específico baseado na hierarquia
  const canEditUserCredentials = (targetUserType: string, targetUserId: string) => {
    if (!canEditCredentials) return false;
    
    // Owner pode editar qualquer um
    if (isOwner) return true;
    
    // Admin pode editar a si mesmo
    if (targetUserId === currentUser?.id) return true;
    
    // Admin NÃO pode editar Owner
    if (targetUserType === 'owner') return false;
    
    // Admin NÃO pode editar outros Admins
    if (targetUserType === 'admin') return false;
    
    // Admin pode editar cargos abaixo (moderacao, suporte, premium, common)
    return true;
  };
  
  // Mantém compatibilidade com código existente
  const canEditEmail = canEditCredentials;
  
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '', // Novo campo para edição de email
    user_type: 'common' as 'common' | 'premium' | 'admin' | 'owner' | 'moderacao' | 'suporte',
    is_premium: false,
    premium_plan: 'basic' as 'basic' | 'pro' | 'max',
    premium_expires_at: '',
    // Novos campos para seleção de data
    premiumExpiresDay: '',
    premiumExpiresMonth: '',
    premiumExpiresYear: '',
    // Modo de seleção: 'date' ou 'months'
    premiumExpirationMode: 'date' as 'date' | 'months',
    // Duração em meses
    premiumDurationMonths: '',
  });
  const [premiumPlans, setPremiumPlans] = useState<Array<{name: string; displayName: string}>>([]);
  const [filterUserType, setFilterUserType] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName?: string;
    action: 'make_admin' | 'remove_admin' | 'delete' | 'reset_password';
  }>({
    isOpen: false,
    userId: null,
    userName: '',
    action: 'make_admin',
  });

  useEffect(() => {
    fetchUsers();
    fetchPremiumPlans();
  }, []);

  const fetchPremiumPlans = async () => {
    try {
      const response = await fetch('/api/premium/plans');
      const data = await response.json();
      if (data.success && data.data.plans) {
        setPremiumPlans(data.data.plans.map((p: any) => ({
          name: p.name,
          displayName: p.displayName
        })));
      } else {
        // Fallback caso a API não retorne planos
        setPremiumPlans([
          { name: 'basic', displayName: 'Premium Básico' },
          { name: 'pro', displayName: 'Premium Pro' },
          { name: 'max', displayName: 'Premium Max' }
        ]);
      }
    } catch (error) {
      console.error('Erro ao buscar planos premium:', error);
      // Fallback em caso de erro
      setPremiumPlans([
        { name: 'basic', displayName: 'Premium Básico' },
        { name: 'pro', displayName: 'Premium Pro' },
        { name: 'max', displayName: 'Premium Max' }
      ]);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        showToast(getErrorMessage(error), 'error');
        return;
      }

      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Funções auxiliares para datas (similar ao cadastro-festa)
  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  const getAvailableYears = () => {
    const currentYear = getCurrentYear();
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(String(currentYear + i));
    }
    return years;
  };

  const getDays = () => {
    return Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  };

  const getMonths = () => {
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const buildDateFromParts = (day: string, month: string, year: string): string => {
    if (!day || !month || !year) return '';
    return `${year}-${month}-${day}`;
  };

  const getMaxDaysInMonth = (month: string, year: string): number => {
    if (!month || !year) return 31;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    if (isNaN(monthNum) || isNaN(yearNum)) return 31;
    return new Date(yearNum, monthNum, 0).getDate();
  };

  const handleEdit = async (user: UserProfile) => {
    setEditingUser(user);
    
    // Se tem data de expiração, separa em dia, mês e ano
    let premiumExpiresDay = '';
    let premiumExpiresMonth = '';
    let premiumExpiresYear = '';
    let premiumExpirationMode: 'date' | 'months' = 'date';
    let premiumDurationMonths = '';
    let premiumPlan: 'basic' | 'pro' | 'max' = 'basic';

    if (user.premium_expires_at) {
      const expiresDate = new Date(user.premium_expires_at);
      premiumExpiresDay = String(expiresDate.getDate()).padStart(2, '0');
      premiumExpiresMonth = String(expiresDate.getMonth() + 1).padStart(2, '0');
      premiumExpiresYear = String(expiresDate.getFullYear());
    }

    // Buscar plano premium atual do usuário
    if (user.is_premium) {
      try {
        const { data: subscription } = await supabase
          .from('premium_subscriptions')
          .select(`
            plan_id,
            premium_plans:plan_id (
              name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (subscription && subscription.premium_plans) {
          const planName = (subscription.premium_plans as any).name;
          if (['basic', 'pro', 'max'].includes(planName)) {
            premiumPlan = planName as 'basic' | 'pro' | 'max';
          }
        }
      } catch (error) {
        console.log('Usuário não tem subscription ativa ou erro ao buscar:', error);
      }
    }

    // Determina o tipo base: se é admin, owner, moderacao ou suporte, mantém; caso contrário, usa 'common'
    // O user_type 'premium' será gerenciado automaticamente pelo toggle is_premium
    const baseUserType = ['admin', 'owner', 'moderacao', 'suporte'].includes(user.user_type)
      ? user.user_type 
      : 'common';

    setEditForm({
      name: user.name,
      phone: user.phone || '',
      email: user.email, // Inclui o email atual
      user_type: baseUserType,
      is_premium: user.is_premium,
      premium_plan: premiumPlan,
      premium_expires_at: user.premium_expires_at
        ? format(new Date(user.premium_expires_at), 'yyyy-MM-dd')
        : '',
      premiumExpiresDay,
      premiumExpiresMonth,
      premiumExpiresYear,
      premiumExpirationMode,
      premiumDurationMonths,
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewPassword('');
    setShowPassword(false);
    setEditForm({
      name: '',
      phone: '',
      email: '',
      user_type: 'common',
      is_premium: false,
      premium_plan: 'basic',
      premium_expires_at: '',
      premiumExpiresDay: '',
      premiumExpiresMonth: '',
      premiumExpiresYear: '',
      premiumExpirationMode: 'date',
      premiumDurationMonths: '',
    });
  };

  // Função para atualizar o email (apenas owner e admin)
  const handleUpdateEmail = async () => {
    if (!editingUser || !canEditEmail) return;
    
    const newEmail = editForm.email.trim().toLowerCase();
    const currentEmail = editingUser.email.toLowerCase();
    
    // Se o email não mudou, não faz nada
    if (newEmail === currentEmail) return;
    
    // Valida formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      showToast('Email inválido', 'error');
      return;
    }
    
    setIsUpdatingEmail(true);
    
    try {
      const response = await fetch('/api/admin/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          newEmail: newEmail,
          requesterId: currentUser?.id,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar email');
      }
      
      showToast('Email atualizado com sucesso!', 'success');
      console.log('✅ [AdminUsers] Email atualizado:', { userId: editingUser.id, newEmail });
      
      // Atualiza a lista de usuários
      await fetchUsers();
    } catch (error: any) {
      console.error('❌ [AdminUsers] Erro ao atualizar email:', error);
      showToast(error.message || 'Erro ao atualizar email', 'error');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Função para atualizar a senha (apenas owner e admin)
  const handleUpdatePassword = async () => {
    if (!editingUser || !canEditEmail) return; // Usa mesma permissão (owner/admin)
    
    if (!newPassword.trim()) {
      showToast('Digite a nova senha', 'warning');
      return;
    }
    
    if (newPassword.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'warning');
      return;
    }
    
    setIsUpdatingPassword(true);
    
    try {
      const response = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          newPassword: newPassword,
          requesterId: currentUser?.id,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar senha');
      }
      
      showToast('Senha atualizada com sucesso!', 'success');
      console.log('✅ [AdminUsers] Senha atualizada para:', editingUser.name);
      setNewPassword('');
      setShowPassword(false);
    } catch (error: any) {
      console.error('❌ [AdminUsers] Erro ao atualizar senha:', error);
      showToast(error.message || 'Erro ao atualizar senha', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;

    // Validações
    if (!editForm.name.trim()) {
      showToast('O nome é obrigatório.', 'warning');
      return;
    }

    if (editForm.name.trim().length < 2) {
      showToast('O nome deve ter pelo menos 2 caracteres.', 'warning');
      return;
    }

    // Validação para Premium
    if (editForm.is_premium) {
      if (editForm.premiumExpirationMode === 'date') {
        // Valida se todos os campos de data estão preenchidos
        if (!editForm.premiumExpiresDay || !editForm.premiumExpiresMonth || !editForm.premiumExpiresYear) {
          showToast('Preencha dia, mês e ano da data de expiração do Premium.', 'warning');
          return;
        }
      } else if (editForm.premiumExpirationMode === 'months') {
        // Valida se a duração em meses está selecionada
        if (!editForm.premiumDurationMonths) {
          showToast('Selecione a duração do Premium em meses.', 'warning');
          return;
        }
      }
    }

    // Se está tornando admin, pede confirmação
    if (editForm.user_type === 'admin' && editingUser.user_type !== 'admin') {
      setConfirmModal({
        isOpen: true,
        userId: editingUser.id,
        action: 'make_admin',
      });
      return;
    }

    // Se está removendo admin, pede confirmação
    if (editForm.user_type !== 'admin' && editingUser.user_type === 'admin') {
      setConfirmModal({
        isOpen: true,
        userId: editingUser.id,
        action: 'remove_admin',
      });
      return;
    }

    await saveUser();
  };

  const saveUser = async () => {
    if (!editingUser) return;

    setIsSaving(true);
    try {
      // Lógica de user_type:
      // - Se for admin, owner, moderacao ou suporte, sempre mantém (independente do Premium)
      // - Se não for admin/owner/moderacao/suporte e Premium estiver ativo, define como 'premium'
      // - Se não for admin/owner/moderacao/suporte e Premium estiver inativo, define como 'common'
      const finalUserType = ['admin', 'owner', 'moderacao', 'suporte'].includes(editForm.user_type)
        ? editForm.user_type
        : editForm.is_premium
        ? 'premium'
        : 'common';

      const updateData: any = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        user_type: finalUserType,
        is_premium: editForm.is_premium,
        // Não precisa setar updated_at manualmente, o trigger do banco faz isso
      };

      // Adiciona premium_expires_at apenas se is_premium for true
      if (editForm.is_premium) {
        let expirationDate: string | null = null;

        if (editForm.premiumExpirationMode === 'months' && editForm.premiumDurationMonths) {
          // Calcula data baseada em meses a partir de hoje
          const months = parseInt(editForm.premiumDurationMonths);
          if (!isNaN(months) && months > 0) {
            const expiration = new Date();
            expiration.setMonth(expiration.getMonth() + months);
            // Define para o final do dia (23:59:59)
            expiration.setHours(23, 59, 59, 999);
            expirationDate = expiration.toISOString();
            console.log('📅 [AdminUsers] Data calculada a partir de meses:', {
              months,
              expirationDate: format(expiration, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
            });
          }
        } else if (editForm.premiumExpirationMode === 'date') {
          // Usa data específica dos seletores
          if (editForm.premiumExpiresDay && editForm.premiumExpiresMonth && editForm.premiumExpiresYear) {
            const dateStr = buildDateFromParts(
              editForm.premiumExpiresDay,
              editForm.premiumExpiresMonth,
              editForm.premiumExpiresYear
            );
            if (dateStr) {
              const expiration = new Date(dateStr);
              // Define para o final do dia (23:59:59)
              expiration.setHours(23, 59, 59, 999);
              expirationDate = expiration.toISOString();
              console.log('📅 [AdminUsers] Data específica selecionada:', {
                dateStr,
                expirationDate: format(expiration, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
              });
            }
          }
        }

        updateData.premium_expires_at = expirationDate;
      } else {
        updateData.premium_expires_at = null;
      }

      console.log('💾 [AdminUsers] Salvando alterações do usuário:', {
        userId: editingUser.id,
        updateData,
      });

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', editingUser.id)
        .select(); // Retorna os dados atualizados para verificação

      if (error) {
        console.error('❌ [AdminUsers] Erro ao atualizar usuário no Supabase:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        showToast(getErrorMessage(error), 'error');
        return;
      }

      if (data && data.length > 0) {
        console.log('✅ [AdminUsers] Usuário atualizado com sucesso no banco de dados:', {
          userId: data[0].id,
          name: data[0].name,
          user_type: data[0].user_type,
          is_premium: data[0].is_premium,
        });

        // Se premium foi ativado, criar/atualizar subscription
        if (editForm.is_premium && updateData.premium_expires_at) {
          try {
            // Buscar o plano premium selecionado
            const { data: planData } = await supabase
              .from('premium_plans')
              .select('id')
              .eq('name', editForm.premium_plan)
              .eq('is_active', true)
              .single();

            if (planData) {
              // Verificar se já existe subscription ativa
              const { data: existingSub } = await supabase
                .from('premium_subscriptions')
                .select('id')
                .eq('user_id', editingUser.id)
                .eq('status', 'active')
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

              if (existingSub) {
                // Atualizar subscription existente
                await supabase
                  .from('premium_subscriptions')
                  .update({
                    plan_id: planData.id,
                    expires_at: updateData.premium_expires_at,
                    status: 'active',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingSub.id);
                console.log('✅ [AdminUsers] Subscription atualizada');
              } else {
                // Criar nova subscription
                await supabase
                  .from('premium_subscriptions')
                  .insert({
                    user_id: editingUser.id,
                    plan_id: planData.id,
                    status: 'active',
                    started_at: new Date().toISOString(),
                    expires_at: updateData.premium_expires_at,
                    auto_renew: false,
                  });
                console.log('✅ [AdminUsers] Nova subscription criada');
              }
            }
          } catch (subError) {
            console.error('⚠️ [AdminUsers] Erro ao criar/atualizar subscription:', subError);
            // Não falha o processo, apenas loga o erro
          }
        } else if (!editForm.is_premium) {
          // Se premium foi desativado, desativar subscriptions ativas
          try {
            await supabase
              .from('premium_subscriptions')
              .update({ status: 'inactive' })
              .eq('user_id', editingUser.id)
              .eq('status', 'active');
            console.log('✅ [AdminUsers] Subscriptions desativadas');
          } catch (subError) {
            console.error('⚠️ [AdminUsers] Erro ao desativar subscriptions:', subError);
          }
        }

        showToast('Usuário atualizado com sucesso!', 'success');
      } else {
        console.warn('⚠️ [AdminUsers] Update executado mas nenhum dado retornado');
        showToast('Usuário atualizado, mas não foi possível verificar os dados.', 'warning');
      }

      setEditingUser(null);
      await fetchUsers(); // Recarrega a lista para mostrar os dados atualizados
    } catch (error: any) {
      console.error('❌ [AdminUsers] Erro ao atualizar usuário:', {
        message: error.message,
        stack: error.stack,
      });
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsSaving(false);
      setConfirmModal({ isOpen: false, userId: null, action: 'make_admin' });
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      setIsSaving(true);
      
      // Busca o email do usuário
      const user = users.find(u => u.id === userId);
      if (!user) {
        showToast('Usuário não encontrado.', 'error');
        return;
      }

      // Chama a API route para reset de senha
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro ao resetar senha:', data);
        showToast(data.error || 'Erro ao enviar email de redefinição de senha.', 'error');
        return;
      }

      showToast(`Email de redefinição de senha enviado para ${user.email}`, 'success');
      setConfirmModal({ isOpen: false, userId: null, userName: '', action: 'make_admin' });
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      showToast('Erro ao enviar email de redefinição de senha.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmAction = async () => {
    if (confirmModal.action === 'make_admin' || confirmModal.action === 'remove_admin') {
      await saveUser();
    } else if (confirmModal.action === 'reset_password' && confirmModal.userId) {
      await handleResetPassword(confirmModal.userId);
    }
  };

  // Usuários da equipe administrativa (owner, admin, moderacao, suporte)
  const staffUsers = users.filter((user) => 
    ['owner', 'admin', 'moderacao', 'suporte'].includes(user.user_type)
  );

  // Usuários comuns e premium (exclui administrativos)
  const regularUsers = users.filter((user) => 
    !['owner', 'admin', 'moderacao', 'suporte'].includes(user.user_type)
  );

  const filteredUsers = regularUsers.filter((user) => {
    // Filtro por tipo de usuário (apenas common e premium)
    if (filterUserType !== 'all' && filterUserType !== 'common' && filterUserType !== 'premium') {
      return false;
    }
    if (filterUserType !== 'all' && user.user_type !== filterUserType) {
      return false;
    }
    
    // Filtro por busca (nome, email, telefone)
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.phone && user.phone.toLowerCase().includes(query))
    );
  });

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'admin':
        return <ShieldCheck size={16} className="text-red-400" />;
      case 'owner':
        return <Crown size={16} className="text-yellow-400" />;
      case 'moderacao':
        return <Shield size={16} className="text-blue-400" />;
      case 'suporte':
        return <Headphones size={16} className="text-emerald-400" />;
      case 'premium':
        return <Sparkles size={16} className="text-neon-purple" />;
      default:
        return <User size={16} className="text-gray-400" />;
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'Administrador';
      case 'owner':
        return 'Owner';
      case 'moderacao':
        return 'Moderação';
      case 'suporte':
        return 'Suporte';
      case 'premium':
        return 'Premium';
      default:
        return 'Comum';
    }
  };

  const getUserTypeBadgeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'owner':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'moderacao':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'suporte':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'premium':
        return 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white mb-2">
              Usuários Cadastrados
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm">
              Visualize e gerencie todos os usuários do sistema
            </p>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="space-y-4">
          {/* Busca */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
              <Search 
                size={20} 
                className={`transition-colors duration-300 ${
                  searchQuery 
                    ? 'text-neon-pink' 
                    : 'text-gray-500 group-hover:text-neon-blue group-focus-within:text-neon-pink'
                }`} 
              />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, email ou telefone..."
              className="input-field pl-12 pr-4 w-full bg-dark-800/50 border-dark-600 text-white placeholder-gray-500 
                         focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/50 focus:bg-dark-800
                         hover:border-neon-blue/50 transition-all duration-300
                         shadow-lg shadow-dark-900/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 
                           text-gray-400 hover:text-neon-pink transition-colors duration-300
                           p-1 rounded-full hover:bg-dark-700"
                aria-label="Limpar busca"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filtro por Tipo de Usuário */}
          <div>
            <label className="input-label mb-2 block">Filtrar por Tipo</label>
            <select
              value={filterUserType}
              onChange={(e) => setFilterUserType(e.target.value)}
              className="input-field w-full sm:w-auto bg-dark-800/50 border-dark-600 text-white
                         focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/50 focus:bg-dark-800
                         hover:border-neon-blue/50 transition-all duration-300"
            >
              <option value="all">Todos</option>
              <option value="premium">Premium</option>
              <option value="common">Comum</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-blue-500/20 to-blue-700/20 border-blue-500/50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-400 mb-1 truncate">Total de Usuários</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{users.length}</p>
            </div>
            <Users size={20} className="text-blue-400 flex-shrink-0 ml-2" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 border-neon-pink/50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-400 mb-1 truncate">Usuários Premium</p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {users.filter((u) => u.is_premium || u.user_type === 'premium').length}
              </p>
            </div>
            <Sparkles size={20} className="text-neon-pink flex-shrink-0 ml-2" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-500/20 to-red-700/20 border-red-500/50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-400 mb-1 truncate">Administradores</p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {users.filter((u) => u.user_type === 'admin').length}
              </p>
            </div>
            <Shield size={20} className="text-red-400 flex-shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* Equipe Administrativa */}
      {staffUsers.length > 0 && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-dark-800/80 via-dark-800/50 to-dark-800/80 backdrop-blur-sm rounded-xl border border-neon-purple/30 overflow-hidden">
            {/* Header da Equipe */}
            <div className="p-4 border-b border-neon-purple/20 bg-gradient-to-r from-neon-purple/10 via-neon-pink/5 to-neon-purple/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center">
                  <Shield size={20} className="text-neon-purple" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-white">
                    Equipe Administrativa
                  </h2>
                  <p className="text-xs text-gray-400">
                    {staffUsers.length} membro{staffUsers.length !== 1 ? 's' : ''} com permissões especiais
                  </p>
                </div>
              </div>
            </div>
            
            {/* Lista da Equipe */}
            <div className="p-4 space-y-3">
              {staffUsers.map((user) => {
                const isEditing = editingUser?.id === user.id;
                
                return (
                  <div
                    key={`staff-${user.id}`}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      isEditing
                        ? 'bg-neon-pink/10 border-neon-pink/50'
                        : 'bg-dark-700/50 border-dark-600 hover:border-neon-purple/50'
                    }`}
                  >
                    {isEditing ? (
                      // Modo de Edição Inline
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-display font-bold text-lg text-white">Editando Membro da Equipe</h3>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Nome */}
                          <div>
                            <label className="input-label">Nome *</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="input-field w-full"
                              placeholder="Nome do usuário"
                              disabled={isSaving}
                            />
                          </div>

                          {/* Telefone */}
                          <div>
                            <label className="input-label">Telefone</label>
                            <input
                              type="tel"
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              className="input-field w-full"
                              placeholder="(11) 99999-9999"
                              disabled={isSaving}
                            />
                          </div>

                          {/* Tipo de Usuário */}
                          <div>
                            <label className="input-label">Cargo *</label>
                            <select
                              value={editForm.user_type}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  user_type: e.target.value as 'common' | 'premium' | 'admin' | 'owner' | 'moderacao' | 'suporte',
                                })
                              }
                              className="input-field w-full"
                              disabled={isSaving}
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Administrador</option>
                              <option value="moderacao">Moderação</option>
                              <option value="suporte">Suporte</option>
                              <option value="common">Comum</option>
                            </select>
                          </div>

                          {/* Status Premium */}
                          <div>
                            <label className="input-label">Status Premium</label>
                            <div className="flex items-center gap-3 mt-2">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editForm.is_premium}
                                  onChange={(e) => {
                                    const isPremium = e.target.checked;
                                    // Define o tipo de usuário automaticamente
                                    const newUserType = isPremium && !['admin', 'owner', 'moderacao', 'suporte'].includes(editForm.user_type)
                                      ? 'premium'
                                      : !isPremium && editForm.user_type === 'premium'
                                      ? 'common'
                                      : editForm.user_type;
                                    
                                    setEditForm({
                                      ...editForm,
                                      is_premium: isPremium,
                                      user_type: newUserType,
                                      // Se desativar Premium, limpa campos de data
                                      ...(!isPremium
                                        ? {
                                            premiumExpiresDay: '',
                                            premiumExpiresMonth: '',
                                            premiumExpiresYear: '',
                                            premiumDurationMonths: '',
                                            premium_plan: 'basic',
                                          }
                                        : {}),
                                    });
                                  }}
                                  className="sr-only peer"
                                  disabled={isSaving}
                                />
                                <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-pink"></div>
                              </label>
                              <span className="text-sm text-gray-400">
                                {editForm.is_premium ? 'Premium Ativo' : 'Premium Inativo'}
                              </span>
                            </div>
                          </div>

                          {/* Seleção do Plano Premium e Data de Expiração */}
                          {editForm.is_premium && (
                            <div className="sm:col-span-2 space-y-4">
                              {/* Seleção do Plano Premium */}
                              <div>
                                <label className="input-label">Plano Premium *</label>
                                <select
                                  value={editForm.premium_plan}
                                  onChange={(e) => {
                                    const selectedPlan = e.target.value as 'basic' | 'pro' | 'max';
                                    // Define automaticamente o tipo de usuário como 'premium' quando um plano é selecionado
                                    const newUserType = !['admin', 'owner', 'moderacao', 'suporte'].includes(editForm.user_type)
                                      ? 'premium'
                                      : editForm.user_type;
                                    
                                    setEditForm({
                                      ...editForm,
                                      premium_plan: selectedPlan,
                                      user_type: newUserType,
                                    });
                                  }}
                                  className="input-field w-full"
                                  disabled={isSaving}
                                >
                                  {premiumPlans.length > 0 ? (
                                    premiumPlans.map((plan) => (
                                      <option key={plan.name} value={plan.name}>
                                        {plan.displayName}
                                      </option>
                                    ))
                                  ) : (
                                    <>
                                      <option value="basic">Premium Básico</option>
                                      <option value="pro">Premium Pro</option>
                                      <option value="max">Premium Max</option>
                                    </>
                                  )}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                  Selecione o plano premium. O tipo de usuário será automaticamente definido como "Premium".
                                </p>
                              </div>

                              {/* Modo de Seleção: Data Específica ou Duração em Meses */}
                              <div>
                                <label className="input-label mb-2 block">Tipo de Definição</label>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="premiumExpirationModeStaff"
                                      value="date"
                                      checked={editForm.premiumExpirationMode === 'date'}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          premiumExpirationMode: e.target.value as 'date' | 'months',
                                          premiumDurationMonths: '', // Limpa meses ao mudar para data
                                        })
                                      }
                                      className="w-4 h-4 text-neon-pink focus:ring-neon-pink"
                                      disabled={isSaving}
                                    />
                                    <span className="text-sm text-gray-300">Data Específica</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="premiumExpirationModeStaff"
                                      value="months"
                                      checked={editForm.premiumExpirationMode === 'months'}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          premiumExpirationMode: e.target.value as 'date' | 'months',
                                          premiumExpiresDay: '', // Limpa data ao mudar para meses
                                          premiumExpiresMonth: '',
                                          premiumExpiresYear: '',
                                        })
                                      }
                                      className="w-4 h-4 text-neon-pink focus:ring-neon-pink"
                                      disabled={isSaving}
                                    />
                                    <span className="text-sm text-gray-300">Duração em Meses</span>
                                  </label>
                                </div>
                              </div>

                              {/* Seleção por Data Específica */}
                              {editForm.premiumExpirationMode === 'date' && (
                                <div>
                                  <label className="input-label">Data de Expiração do Premium *</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {/* Dia */}
                                    <div>
                                      <select
                                        value={editForm.premiumExpiresDay}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, premiumExpiresDay: e.target.value })
                                        }
                                        className="input-field w-full"
                                        disabled={isSaving}
                                      >
                                        <option value="">Dia</option>
                                        {getDays()
                                          .slice(
                                            0,
                                            getMaxDaysInMonth(
                                              editForm.premiumExpiresMonth || '01',
                                              editForm.premiumExpiresYear || String(getCurrentYear())
                                            )
                                          )
                                          .map((day) => (
                                            <option key={day} value={day}>
                                              {day}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                    {/* Mês */}
                                    <div>
                                      <select
                                        value={editForm.premiumExpiresMonth}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, premiumExpiresMonth: e.target.value })
                                        }
                                        className="input-field w-full"
                                        disabled={isSaving}
                                      >
                                        <option value="">Mês</option>
                                        {getMonths().map((month, index) => (
                                          <option key={month} value={month}>
                                            {monthNames[index]}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    {/* Ano */}
                                    <div>
                                      <select
                                        value={editForm.premiumExpiresYear}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, premiumExpiresYear: e.target.value })
                                        }
                                        className="input-field w-full"
                                        disabled={isSaving}
                                      >
                                        <option value="">Ano</option>
                                        {getAvailableYears().map((year) => (
                                          <option key={year} value={year}>
                                            {year}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Seleção por Duração em Meses */}
                              {editForm.premiumExpirationMode === 'months' && (
                                <div>
                                  <label className="input-label">Duração do Premium *</label>
                                  <select
                                    value={editForm.premiumDurationMonths}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, premiumDurationMonths: e.target.value })
                                    }
                                    className="input-field w-full"
                                    disabled={isSaving}
                                  >
                                    <option value="">Selecione a duração</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((months) => (
                                      <option key={months} value={String(months)}>
                                        {months} {months === 1 ? 'mês' : 'meses'}
                                      </option>
                                    ))}
                                  </select>
                                  {editForm.premiumDurationMonths && (
                                    <p className="text-xs text-gray-400 mt-2">
                                      O Premium expirará em{' '}
                                      {(() => {
                                        const months = parseInt(editForm.premiumDurationMonths);
                                        const expiration = new Date();
                                        expiration.setMonth(expiration.getMonth() + months);
                                        return format(expiration, "dd/MM/yyyy", { locale: ptBR });
                                      })()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Email */}
                        {canEditUserCredentials(user.user_type, user.id) && (
                          <div className="pt-4 border-t border-dark-600">
                            <label className="input-label flex items-center gap-2">
                              <Mail size={16} />
                              Email <span className="text-neon-green text-xs">(editável)</span>
                            </label>
                            <div className="flex gap-2 mt-2">
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="input-field flex-1"
                                placeholder="novo@email.com"
                                disabled={isSaving || isUpdatingEmail}
                              />
                              {editForm.email.toLowerCase() !== user.email.toLowerCase() && (
                                <button
                                  onClick={handleUpdateEmail}
                                  disabled={isUpdatingEmail || isSaving}
                                  className="px-4 py-2 bg-neon-green/20 hover:bg-neon-green/30 border border-neon-green/50 hover:border-neon-green text-neon-green rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                  {isUpdatingEmail ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Senha */}
                        {canEditUserCredentials(user.user_type, user.id) && (
                          <div className="pt-4 border-t border-dark-600">
                            <label className="input-label flex items-center gap-2">
                              <Lock size={16} />
                              Nova Senha <span className="text-neon-green text-xs">(opcional)</span>
                            </label>
                            <div className="flex gap-2 mt-2">
                              <div className="relative flex-1">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  className="input-field w-full pr-10"
                                  placeholder="Nova senha (mín. 6 caracteres)"
                                  disabled={isSaving || isUpdatingPassword}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                >
                                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                              {newPassword.trim() && (
                                <button
                                  onClick={handleUpdatePassword}
                                  disabled={isUpdatingPassword || isSaving}
                                  className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 hover:border-neon-purple text-neon-purple rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                  {isUpdatingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Botões */}
                        <div className="flex gap-3 pt-4 border-t border-dark-600">
                          <button
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="btn-secondary flex-1 flex items-center justify-center gap-2"
                          >
                            <X size={18} />
                            Cancelar
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 size={18} className="animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Save size={18} />
                                Salvar
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo de Visualização
                      <div className="flex items-center gap-4">
                        {/* Avatar com Ícone do Cargo */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          user.user_type === 'owner' ? 'bg-yellow-500/20' :
                          user.user_type === 'admin' ? 'bg-red-500/20' :
                          user.user_type === 'moderacao' ? 'bg-blue-500/20' :
                          'bg-emerald-500/20'
                        }`}>
                          {user.user_type === 'owner' && <Crown size={24} className="text-yellow-400" />}
                          {user.user_type === 'admin' && <ShieldCheck size={24} className="text-red-400" />}
                          {user.user_type === 'moderacao' && <Shield size={24} className="text-blue-400" />}
                          {user.user_type === 'suporte' && <Headphones size={24} className="text-emerald-400" />}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-bold text-white truncate">
                              {user.name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              user.user_type === 'owner' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              user.user_type === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              user.user_type === 'moderacao' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {getUserTypeLabel(user.user_type)}
                            </span>
                            {user.is_premium && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
                                Premium
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              📧 {user.email}
                            </span>
                            {user.phone && (
                              <span className="flex items-center gap-1">
                                📞 {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Botão Editar */}
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-4 py-2 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 hover:border-neon-purple text-neon-purple rounded-xl transition-all flex items-center gap-2"
                        >
                          <Edit size={16} />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Usuários Comuns e Premium */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-display font-bold text-lg sm:text-xl text-white">
            Usuários ({filteredUsers.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-neon-blue" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">
              {searchQuery ? 'Nenhum usuário encontrado com essa busca.' : 'Nenhum usuário cadastrado.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const isEditing = editingUser?.id === user.id;

              return (
                <div
                  key={user.id}
                  className={`p-4 bg-dark-700 rounded-lg border transition-colors ${
                    isEditing
                      ? 'border-neon-pink bg-neon-pink/10'
                      : 'border-dark-600 hover:border-red-500/50'
                  }`}
                >
                  {isEditing ? (
                    // Modo de Edição
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-bold text-lg text-white">Editando Usuário</h3>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Nome */}
                        <div>
                          <label className="input-label">Nome *</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="input-field w-full"
                            placeholder="Nome do usuário"
                            disabled={isSaving}
                          />
                        </div>

                        {/* Telefone */}
                        <div>
                          <label className="input-label">Telefone</label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="input-field w-full"
                            placeholder="(11) 99999-9999"
                            disabled={isSaving}
                          />
                        </div>

                        {/* Tipo de Usuário */}
                        <div>
                          <label className="input-label">Tipo de Usuário *</label>
                            <select
                            value={editForm.user_type}
                            onChange={(e) => {
                              const newUserType = e.target.value as 'common' | 'premium' | 'admin' | 'owner' | 'moderacao' | 'suporte';
                              // Se mudar para um cargo especial ou common, desativa premium
                              if (['admin', 'owner', 'moderacao', 'suporte', 'common'].includes(newUserType)) {
                                setEditForm({
                                  ...editForm,
                                  user_type: newUserType,
                                  is_premium: false,
                                });
                              } else {
                                setEditForm({
                                  ...editForm,
                                  user_type: newUserType,
                                });
                              }
                            }}
                            className="input-field w-full"
                            disabled={isSaving || editForm.is_premium}
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Administrador</option>
                            <option value="moderacao">Moderação</option>
                            <option value="suporte">Suporte</option>
                            <option value="common">Comum</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {editForm.is_premium 
                              ? 'O tipo de usuário está definido como "Premium" automaticamente pelo plano selecionado.'
                              : 'O tipo "Premium" é definido automaticamente ao selecionar um plano premium abaixo.'}
                          </p>
                        </div>

                        {/* Status Premium */}
                        <div>
                          <label className="input-label">Status Premium</label>
                          <div className="flex items-center gap-3 mt-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.is_premium}
                                onChange={(e) => {
                                  const isPremium = e.target.checked;
                                  setEditForm({
                                    ...editForm,
                                    is_premium: isPremium,
                                    // Se ativar Premium e não for admin/owner/moderacao/suporte, limpa campos de data
                                    // Se desativar Premium, limpa campos de data
                                    ...(isPremium && !['admin', 'owner', 'moderacao', 'suporte'].includes(editForm.user_type)
                                      ? {}
                                      : !isPremium
                                      ? {
                                          premiumExpiresDay: '',
                                          premiumExpiresMonth: '',
                                          premiumExpiresYear: '',
                                          premiumDurationMonths: '',
                                        }
                                      : {}),
                                  });
                                }}
                                className="sr-only peer"
                                disabled={isSaving}
                              />
                              <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-pink"></div>
                            </label>
                            <span className="text-sm text-gray-400">
                              {editForm.is_premium ? 'Premium Ativo' : 'Premium Inativo'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {editForm.is_premium
                              ? 'O usuário terá acesso às funcionalidades Premium.'
                              : 'O usuário não terá acesso às funcionalidades Premium.'}
                          </p>
                        </div>

                        {/* Data de Expiração Premium */}
                        {editForm.is_premium && (
                          <div className="sm:col-span-2 space-y-4">
                            {/* Seleção do Plano Premium */}
                            <div>
                              <label className="input-label">Plano Premium *</label>
                              <select
                                value={editForm.premium_plan}
                                onChange={(e) => {
                                  const selectedPlan = e.target.value as 'basic' | 'pro' | 'max';
                                  // Define automaticamente o tipo de usuário como 'premium' quando um plano é selecionado
                                  const newUserType = !['admin', 'owner', 'moderacao', 'suporte'].includes(editForm.user_type)
                                    ? 'premium'
                                    : editForm.user_type;
                                  
                                  setEditForm({
                                    ...editForm,
                                    premium_plan: selectedPlan,
                                    user_type: newUserType,
                                  });
                                }}
                                className="input-field w-full"
                                disabled={isSaving}
                              >
                                {premiumPlans.length > 0 ? (
                                  premiumPlans.map((plan) => (
                                    <option key={plan.name} value={plan.name}>
                                      {plan.displayName}
                                    </option>
                                  ))
                                ) : (
                                  <>
                                    <option value="basic">Premium Básico</option>
                                    <option value="pro">Premium Pro</option>
                                    <option value="max">Premium Max</option>
                                  </>
                                )}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                Selecione o plano premium. O tipo de usuário será automaticamente definido como "Premium".
                              </p>
                            </div>

                            {/* Modo de Seleção: Data Específica ou Duração em Meses */}
                            <div>
                              <label className="input-label mb-2 block">Tipo de Definição</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="premiumExpirationMode"
                                    value="date"
                                    checked={editForm.premiumExpirationMode === 'date'}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        premiumExpirationMode: e.target.value as 'date' | 'months',
                                        premiumDurationMonths: '', // Limpa meses ao mudar para data
                                      })
                                    }
                                    className="w-4 h-4 text-neon-pink focus:ring-neon-pink"
                                    disabled={isSaving}
                                  />
                                  <span className="text-sm text-gray-300">Data Específica</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="premiumExpirationMode"
                                    value="months"
                                    checked={editForm.premiumExpirationMode === 'months'}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        premiumExpirationMode: e.target.value as 'date' | 'months',
                                        premiumExpiresDay: '', // Limpa data ao mudar para meses
                                        premiumExpiresMonth: '',
                                        premiumExpiresYear: '',
                                      })
                                    }
                                    className="w-4 h-4 text-neon-pink focus:ring-neon-pink"
                                    disabled={isSaving}
                                  />
                                  <span className="text-sm text-gray-300">Duração em Meses</span>
                                </label>
                              </div>
                            </div>

                            {/* Seleção por Data Específica */}
                            {editForm.premiumExpirationMode === 'date' && (
                              <div>
                                <label className="input-label">Data de Expiração do Premium *</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {/* Dia */}
                                  <div>
                                    <select
                                      value={editForm.premiumExpiresDay}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, premiumExpiresDay: e.target.value })
                                      }
                                      className="input-field w-full"
                                      disabled={isSaving}
                                    >
                                      <option value="">Dia</option>
                                      {getDays()
                                        .slice(
                                          0,
                                          getMaxDaysInMonth(
                                            editForm.premiumExpiresMonth || '01',
                                            editForm.premiumExpiresYear || String(getCurrentYear())
                                          )
                                        )
                                        .map((day) => (
                                          <option key={day} value={day}>
                                            {day}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                  {/* Mês */}
                                  <div>
                                    <select
                                      value={editForm.premiumExpiresMonth}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, premiumExpiresMonth: e.target.value })
                                      }
                                      className="input-field w-full"
                                      disabled={isSaving}
                                    >
                                      <option value="">Mês</option>
                                      {getMonths().map((month, index) => (
                                        <option key={month} value={month}>
                                          {monthNames[index]}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  {/* Ano */}
                                  <div>
                                    <select
                                      value={editForm.premiumExpiresYear}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, premiumExpiresYear: e.target.value })
                                      }
                                      className="input-field w-full"
                                      disabled={isSaving}
                                    >
                                      <option value="">Ano</option>
                                      {getAvailableYears().map((year) => (
                                        <option key={year} value={year}>
                                          {year}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Seleção por Duração em Meses */}
                            {editForm.premiumExpirationMode === 'months' && (
                              <div>
                                <label className="input-label">Duração do Premium *</label>
                                <select
                                  value={editForm.premiumDurationMonths}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, premiumDurationMonths: e.target.value })
                                  }
                                  className="input-field w-full"
                                  disabled={isSaving}
                                >
                                  <option value="">Selecione a duração</option>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((months) => (
                                    <option key={months} value={String(months)}>
                                      {months} {months === 1 ? 'mês' : 'meses'}
                                    </option>
                                  ))}
                                </select>
                                {editForm.premiumDurationMonths && (
                                  <p className="text-xs text-gray-400 mt-2">
                                    O Premium expirará em{' '}
                                    {(() => {
                                      const months = parseInt(editForm.premiumDurationMonths);
                                      const expiration = new Date();
                                      expiration.setMonth(expiration.getMonth() + months);
                                      return format(expiration, "dd/MM/yyyy", { locale: ptBR });
                                    })()}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Email */}
                      <div className="pt-4 border-t border-dark-600">
                        <label className="input-label flex items-center gap-2">
                          <Mail size={16} />
                          Email {canEditUserCredentials(user.user_type, user.id) && <span className="text-neon-green text-xs">(editável)</span>}
                        </label>
                        
                        {canEditUserCredentials(user.user_type, user.id) ? (
                          // Owner e Admin podem editar o email (respeitando hierarquia)
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="input-field flex-1"
                                placeholder="novo@email.com"
                                disabled={isSaving || isUpdatingEmail}
                              />
                              {editForm.email.toLowerCase() !== user.email.toLowerCase() && (
                                <button
                                  onClick={handleUpdateEmail}
                                  disabled={isUpdatingEmail || isSaving}
                                  className="px-4 py-2 bg-neon-green/20 hover:bg-neon-green/30 border border-neon-green/50 hover:border-neon-green text-neon-green rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                  {isUpdatingEmail ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    <Save size={16} />
                                  )}
                                  <span className="hidden sm:inline">Salvar Email</span>
                                </button>
                              )}
                            </div>
                            {editForm.email.toLowerCase() !== user.email.toLowerCase() && (
                              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-xs text-yellow-400">
                                  ⚠️ <strong>Atenção:</strong> Ao alterar o email, o usuário precisará usar o novo email para fazer login.
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-gray-500">
                              Como {currentUser?.userType === 'owner' ? 'Owner' : 'Admin'}, você pode alterar o email diretamente.
                            </p>
                          </div>
                        ) : (
                          // Sem permissão para editar o email
                          <>
                        <input
                          type="email"
                          value={user.email}
                          className="input-field w-full bg-dark-800 text-gray-500 cursor-not-allowed"
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">
                              {isAdmin && (user.user_type === 'owner' || user.user_type === 'admin')
                                ? 'Você não pode alterar o email de Owner ou outros Admins.'
                                : 'Apenas Owner e Admin podem alterar emails de usuários.'}
                        </p>
                          </>
                        )}
                      </div>

                      {/* Alteração de Senha */}
                      <div className="pt-4 border-t border-dark-600">
                        <label className="input-label flex items-center gap-2 mb-3">
                          <Lock size={16} />
                          Senha {canEditUserCredentials(user.user_type, user.id) && <span className="text-neon-green text-xs">(editável)</span>}
                        </label>
                        
                        {canEditUserCredentials(user.user_type, user.id) ? (
                          // Owner e Admin podem alterar a senha diretamente (respeitando hierarquia)
                          <div className="space-y-3">
                            <div className="bg-neon-purple/10 border border-neon-purple/30 rounded-lg p-4">
                              <p className="text-sm text-neon-purple mb-3">
                                <strong>Definir nova senha</strong> para {user.name}
                              </p>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="input-field w-full pr-10"
                                    placeholder="Nova senha (mín. 6 caracteres)"
                                    disabled={isSaving || isUpdatingPassword}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                  >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </button>
                                </div>
                                <button
                                  onClick={handleUpdatePassword}
                                  disabled={isUpdatingPassword || isSaving || !newPassword.trim()}
                                  className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 hover:border-neon-purple text-neon-purple rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                  {isUpdatingPassword ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    <Save size={16} />
                                  )}
                                  <span className="hidden sm:inline">Salvar</span>
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                Como {currentUser?.userType === 'owner' ? 'Owner' : 'Admin'}, você pode definir uma nova senha diretamente.
                              </p>
                            </div>
                            
                            {/* Opção de enviar email */}
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                              <p className="text-sm text-blue-400 mb-3">
                                Ou enviar email de redefinição para <strong>{user.email}</strong>
                              </p>
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    userId: user.id,
                                    action: 'reset_password',
                                    userName: user.name,
                                  });
                                }}
                                disabled={isSaving}
                                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 hover:border-blue-500 text-blue-400 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Mail size={16} />
                                <span>Enviar Email de Redefinição</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Outros cargos só podem enviar email
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                          <p className="text-sm text-blue-400 mb-3">
                            Enviar email de redefinição de senha para <strong>{user.email}</strong>
                          </p>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                userId: user.id,
                                action: 'reset_password',
                                userName: user.name,
                              });
                            }}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 hover:border-blue-500 text-blue-400 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <Mail size={16} />
                            <span>Enviar Email de Redefinição</span>
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                              Apenas Owner e Admin podem definir senhas diretamente.
                          </p>
                        </div>
                        )}
                      </div>

                      {/* Botões */}
                      <div className="flex gap-3 pt-4 border-t border-dark-600">
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2"
                        >
                          <X size={18} />
                          Cancelar
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              Salvar Alterações
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo de Visualização
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-1 flex-shrink-0">{getUserTypeIcon(user.user_type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-display font-bold text-base sm:text-lg text-white truncate">
                              {user.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs rounded flex-shrink-0 ${getUserTypeBadgeColor(user.user_type)}`}
                            >
                              {getUserTypeLabel(user.user_type)}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                            <span className="truncate">📧 {user.email}</span>
                            {user.phone && <span className="truncate">📞 {user.phone}</span>}
                            <span className="truncate">
                              📅 Cadastrado em{' '}
                              {format(new Date(user.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                            {user.premium_expires_at && (
                              <span className="truncate">
                                ⏰ Premium expira em{' '}
                                {format(new Date(user.premium_expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-4 py-2 bg-neon-pink/20 hover:bg-neon-pink/30 border border-neon-pink/50 hover:border-neon-pink text-neon-pink rounded-lg transition-colors flex items-center justify-center gap-2 flex-shrink-0 w-full sm:w-auto"
                        title="Editar Usuário"
                      >
                        <Edit size={16} />
                        <span className="text-sm sm:text-base">Editar</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Confirmação para Ações Críticas */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.action === 'make_admin'
            ? 'Tornar Usuário Administrador?'
            : confirmModal.action === 'remove_admin'
            ? 'Remover Permissões de Administrador?'
            : confirmModal.action === 'reset_password'
            ? 'Enviar Email de Redefinição de Senha?'
            : 'Deletar Usuário?'
        }
        message={
          confirmModal.action === 'make_admin'
            ? 'Tem certeza que deseja tornar este usuário um administrador? Ele terá acesso total ao sistema e poderá gerenciar todos os eventos e usuários.'
            : confirmModal.action === 'remove_admin'
            ? 'Tem certeza que deseja remover as permissões de administrador deste usuário? Ele perderá acesso ao painel administrativo.'
            : confirmModal.action === 'reset_password'
            ? `Tem certeza que deseja enviar um email de redefinição de senha para ${confirmModal.userName || 'este usuário'}? O usuário receberá um link para redefinir sua própria senha.`
            : 'Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.'
        }
        confirmText={
          confirmModal.action === 'make_admin'
            ? 'Tornar Admin'
            : confirmModal.action === 'remove_admin'
            ? 'Remover Admin'
            : confirmModal.action === 'reset_password'
            ? 'Enviar Email'
            : 'Deletar'
        }
        cancelText="Cancelar"
        variant={confirmModal.action === 'reset_password' ? 'default' : 'danger'}
        onConfirm={confirmAction}
        onCancel={() => setConfirmModal({ isOpen: false, userId: null, userName: '', action: 'make_admin' })}
      />
    </div>
  );
}
