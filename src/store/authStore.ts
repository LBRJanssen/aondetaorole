// ============================================
// AUTH STORE - Gerenciamento de Autenticacao
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { convertToUUID, generateUUID } from '@/utils/uuid';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  upgradeToPremium: () => void;
  setLoading: (loading: boolean) => void;
  refreshUser: () => Promise<void>;
}

// Dados mock para demonstracao
const mockUsers: Record<string, { password: string; user: User }> = {
  'demo@role.com': {
    password: 'demo123',
    user: {
      id: convertToUUID('user_demo_1'),
      email: 'demo@role.com',
      name: 'Usuario Demo',
      userType: 'common',
      createdAt: new Date(),
      isPremium: false,
    },
  },
  'premium@role.com': {
    password: 'premium123',
    user: {
      id: convertToUUID('user_premium_1'),
      email: 'premium@role.com',
      name: 'Organizador Premium',
      userType: 'premium',
      createdAt: new Date(),
      isPremium: true,
      premiumExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
};

// Função para inicializar e verificar sessão do Supabase
const initSupabaseAuth = async () => {
  if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Erro ao verificar sessão:', error);
        return null;
      }

      if (session?.user) {
        // Busca perfil do usuário
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        // Trata todos os tipos de usuário corretamente
        const userType = (profile?.user_type as any) || 'common';
        const isAdmin = userType === 'admin' || userType === 'owner' || profile?.user_type === 'admin' || profile?.user_type === 'owner';

        const emailConfirmed = session.user.email_confirmed_at !== null && 
                              session.user.email_confirmed_at !== undefined;
        
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          name: profile?.name || session.user.user_metadata?.name || session.user.email!.split('@')[0],
          phone: profile?.phone || undefined,
          photoURL: profile?.photo_url || session.user.user_metadata?.avatar_url || undefined,
          userType: userType,
          createdAt: new Date(session.user.created_at),
          isPremium: profile?.is_premium || false,
          premiumExpiresAt: profile?.premium_expires_at ? new Date(profile.premium_expires_at) : undefined,
          isAdmin: isAdmin,
          emailConfirmed: emailConfirmed,
        };

        return { user, isAuthenticated: true };
      }
    } catch (error) {
      console.error('Erro ao inicializar Supabase Auth:', error);
    }
  }
  return null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      // Inicializa sessão do Supabase se disponível (apenas no cliente)
      if (typeof window !== 'undefined') {
        initSupabaseAuth().then((authState) => {
          if (authState) {
            set(authState);
          }
        });

        // Escuta mudanças na autenticação do Supabase
        if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              initSupabaseAuth().then((authState) => {
                if (authState) {
                  set(authState);
                }
              });
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, isAuthenticated: false });
            }
          });
        }
      }

      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,

        // Login com email/senha ou telefone/senha
      login: async (emailOrPhone: string, password: string) => {
        console.log('🔐 [AuthStore] Iniciando login:', { emailOrPhone: emailOrPhone.substring(0, 10) + '...', hasPassword: !!password });
        set({ isLoading: true });

        try {
          // Tenta usar Supabase Auth se estiver configurado
          if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            console.log('📡 [AuthStore] Fazendo login via Supabase...');
            let emailToUse = emailOrPhone.toLowerCase().trim();
            
            // Verifica se é telefone (contém apenas números ou formato de telefone)
            const phoneDigits = emailOrPhone.replace(/\D/g, '');
            const isPhone = phoneDigits.length >= 10 && phoneDigits.length <= 11 && !emailOrPhone.includes('@');
            
            // Se for telefone, busca o email do usuário pelo telefone
            if (isPhone) {
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('email, phone')
                .eq('phone', phoneDigits)
                .single();
              
              if (profileError || !profile) {
                set({ isLoading: false });
                throw new Error('Telefone não encontrado');
              }
              
              emailToUse = profile.email.toLowerCase();
            }
            
            // Tenta fazer login
            // NOTA: Para permitir login sem confirmação de email, você precisa desabilitar
            // "Confirm email" nas configurações do Supabase Auth (Authentication > Settings > Email Auth)
            console.log('🔑 [AuthStore] Tentando autenticar:', { email: emailToUse, isPhone });
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email: emailToUse,
              password: password,
            });

            if (authError) {
              console.error('❌ [AuthStore] Erro ao fazer login:', {
                status: authError.status,
                message: authError.message,
                name: authError.name,
              });

              // Se der erro de email não confirmado, mostra mensagem mas permite continuar
              const isEmailNotConfirmed = authError.message?.includes('Email not confirmed') || 
                                         authError.message?.includes('email_not_confirmed') ||
                                         authError.message?.includes('email_not_verified');
              
              if (isEmailNotConfirmed) {
                console.warn('⚠️ [AuthStore] Email não confirmado');
                // Para permitir login sem confirmação, você precisa desabilitar a confirmação
                // no Supabase Dashboard: Authentication > Settings > Email Auth > "Confirm email" = OFF
                // Por enquanto, vamos mostrar uma mensagem informativa
                set({ isLoading: false });
                throw new Error('Email não confirmado. Verifique sua caixa de entrada ou configure o Supabase para permitir login sem confirmação.');
              }
              
              // Trata outros erros
              const errorMessage = authError.message || (isPhone ? 'Telefone ou senha invalidos' : 'Email ou senha invalidos');
              throw new Error(errorMessage);
            }

            if (authData.user) {
              console.log('✅ [AuthStore] Login bem-sucedido:', { userId: authData.user.id, email: authData.user.email });
              // Busca perfil do usuário
              console.log('🔍 [AuthStore] Buscando perfil do usuário...');
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

              if (profileError && profileError.code !== 'PGRST116') {
                // PGRST116 = não encontrado, vamos criar o perfil
              }

              const userType = profile?.user_type === 'admin' ? 'admin' : (profile?.user_type as any) || 'common';
              const isAdmin = userType === 'admin' || profile?.user_type === 'admin';
              
              // Verifica se o email está confirmado
              const emailConfirmed = authData.user.email_confirmed_at !== null && 
                                    authData.user.email_confirmed_at !== undefined;

              const user: User = {
                id: authData.user.id,
                email: authData.user.email!,
                name: profile?.name || authData.user.user_metadata?.name || authData.user.email!.split('@')[0],
                phone: profile?.phone || undefined,
                photoURL: profile?.photo_url || authData.user.user_metadata?.avatar_url || undefined,
                userType: userType,
                createdAt: new Date(authData.user.created_at),
                isPremium: profile?.is_premium || false,
                premiumExpiresAt: profile?.premium_expires_at ? new Date(profile.premium_expires_at) : undefined,
                isAdmin: isAdmin,
                emailConfirmed: emailConfirmed,
              };

              // Se não tem perfil, cria um
              if (!profile) {
                console.log('📝 [AuthStore] Criando perfil para usuário novo...');
                const { error: insertError } = await supabase.from('user_profiles').insert({
                  id: user.id,
                  email: user.email,
                  name: user.name,
                });
                
                if (insertError) {
                  console.warn('⚠️ [AuthStore] Erro ao criar perfil:', insertError);
                } else {
                  console.log('✅ [AuthStore] Perfil criado com sucesso');
                }
              }

              console.log('✅ [AuthStore] Usuário autenticado e perfil carregado:', {
                userId: user.id,
                email: user.email,
                name: user.name,
                isAdmin: user.isAdmin,
              });

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }
        } catch (error: any) {
          console.error('❌ [AuthStore] Erro no processo de login:', {
            message: error.message,
            stack: error.stack,
          });
          // Se Supabase não estiver configurado ou houver erro, usa mock
          if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
            console.warn('⚠️ [AuthStore] Supabase não configurado, usando fallback mock');
          } else {
            set({ isLoading: false });
            throw error;
          }
        }

        // Fallback para mock (compatibilidade)
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Verifica se é telefone ou email
        const phoneDigits = emailOrPhone.replace(/\D/g, '');
        const isPhone = phoneDigits.length >= 10 && phoneDigits.length <= 11 && !emailOrPhone.includes('@');
        
        // Para mock, só funciona com email (telefone não funciona no mock)
        if (isPhone) {
          set({ isLoading: false });
          throw new Error('Login com telefone requer configuração do Supabase');
        }
        
        const emailToUse = emailOrPhone.toLowerCase();
        const mockUser = mockUsers[emailToUse];
        
        if (mockUser && mockUser.password === password) {
          set({
            user: mockUser.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
          throw new Error('Email ou senha invalidos');
        }
      },

      // Login de administrador
      loginAdmin: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          // Tenta usar Supabase Auth se estiver configurado
          if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            // Faz login no Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email: email.toLowerCase(),
              password: password,
            });

            if (authError) {
              set({ isLoading: false });
              throw new Error(authError.message || 'Credenciais inválidas');
            }

            if (authData.user) {
              // Busca perfil do usuário
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

              if (profileError && profileError.code !== 'PGRST116') {
                console.error('Erro ao buscar perfil:', profileError);
              }

              // Verifica se é admin
              const isAdmin = profile?.user_type === 'admin' || profile?.is_premium === true;

              if (!isAdmin) {
                // Faz logout se não for admin
                await supabase.auth.signOut();
                set({ isLoading: false });
                throw new Error('Este usuário não é administrador');
              }

              const adminUser: User = {
                id: authData.user.id,
                email: authData.user.email!,
                name: profile?.name || authData.user.user_metadata?.name || 'Administrador',
                phone: profile?.phone || undefined,
                photoURL: profile?.photo_url || authData.user.user_metadata?.avatar_url || undefined,
                userType: 'admin',
                createdAt: new Date(authData.user.created_at),
                isPremium: profile?.is_premium || true,
                isAdmin: true,
              };

              set({
                user: adminUser,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          } else {
            set({ isLoading: false });
            throw new Error('Supabase não está configurado. Configure as variáveis de ambiente.');
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Login com Google (simulado)
      loginWithGoogle: async () => {
        set({ isLoading: true });
        
        await new Promise((resolve) => setTimeout(resolve, 1200));
        
        const googleUser: User = {
          id: convertToUUID('google_user_' + Date.now()),
          email: 'usuario.google@gmail.com',
          name: 'Usuario Google',
          photoURL: 'https://via.placeholder.com/100',
          userType: 'common',
          createdAt: new Date(),
          isPremium: false,
        };
        
        set({
          user: googleUser,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // Registro de novo usuario
      register: async (email: string, password: string, name: string, phone: string) => {
        console.log('🚀 [AuthStore] Iniciando registro de usuário:', { email, name, hasPhone: !!phone });
        set({ isLoading: true });

        try {
          // Validações básicas antes de enviar
          if (!email || !email.includes('@')) {
            console.warn('⚠️ [AuthStore] Email inválido:', email);
            throw new Error('Email inválido');
          }

          if (!password || password.length < 6) {
            console.warn('⚠️ [AuthStore] Senha muito curta:', password.length);
            throw new Error('Senha deve ter pelo menos 6 caracteres');
          }

          // Valida requisitos de senha do Supabase
          const hasLowercase = /[a-z]/.test(password);
          const hasUppercase = /[A-Z]/.test(password);
          const hasNumber = /\d/.test(password);
          const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?/~`]/.test(password);

          if (!hasLowercase) {
            console.warn('⚠️ [AuthStore] Senha não contém letra minúscula');
            throw new Error('A senha deve conter pelo menos uma letra minúscula');
          }

          if (!hasUppercase) {
            console.warn('⚠️ [AuthStore] Senha não contém letra maiúscula');
            throw new Error('A senha deve conter pelo menos uma letra maiúscula');
          }

          if (!hasNumber) {
            console.warn('⚠️ [AuthStore] Senha não contém número');
            throw new Error('A senha deve conter pelo menos um número');
          }

          if (!hasSpecial) {
            console.warn('⚠️ [AuthStore] Senha não contém caractere especial');
            throw new Error('A senha deve conter pelo menos um caractere especial (!@#$%^&*()_+-=[]{};\':"|<>?,./~`)');
          }

          console.log('✅ [AuthStore] Senha atende todos os requisitos');

          if (!name || name.trim().length < 2) {
            console.warn('⚠️ [AuthStore] Nome muito curto:', name);
            throw new Error('Nome deve ter pelo menos 2 caracteres');
          }

          // Tenta usar Supabase Auth se estiver configurado
          if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            // Limpa e valida email
            const cleanEmail = email.trim().toLowerCase();
            console.log('📧 [AuthStore] Email limpo:', cleanEmail);
            
            // Valida formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleanEmail)) {
              console.warn('⚠️ [AuthStore] Formato de email inválido:', cleanEmail);
              throw new Error('Formato de email inválido');
            }

            // Prepara os dados para envio
            const signUpData: any = {
              email: cleanEmail,
              password: password,
            };

            // Adiciona opções apenas se window estiver disponível
            if (typeof window !== 'undefined') {
              signUpData.options = {
                data: {
                  name: name.trim(),
                  ...(phone ? { phone: phone } : {}),
                },
                emailRedirectTo: `${window.location.origin}/home`,
              };
            } else {
              // Fallback para SSR
              signUpData.options = {
                data: {
                  name: name.trim(),
                  ...(phone ? { phone: phone } : {}),
                },
              };
            }

            console.log('📡 [AuthStore] Enviando requisição de registro para Supabase:', {
              email: cleanEmail,
              hasName: !!name.trim(),
              hasPhone: !!phone,
            });

            const { data: authData, error: authError } = await supabase.auth.signUp(signUpData);

            if (authError) {
              console.error('❌ [AuthStore] Erro ao registrar no Supabase:', {
                status: authError.status,
                message: authError.message,
                name: authError.name,
              });

              // Mensagens de erro mais amigáveis baseadas no código de erro
              let errorMessage = 'Erro ao criar conta';
              
              // Verifica o código de erro do Supabase
              if (authError.status === 422) {
                console.warn('⚠️ [AuthStore] Erro 422 (Unprocessable Content) - dados inválidos');
                
                // Erro específico de senha fraca
                if (authError.name === 'AuthWeakPasswordError' || authError.message.includes('Password should contain')) {
                  errorMessage = 'A senha deve conter pelo menos: uma letra minúscula, uma maiúscula, um número e um caractere especial (!@#$%^&*()_+-=[]{};\':"|<>?,./~`)';
                } else if (authError.message.includes('already registered') || authError.message.includes('already exists') || authError.message.includes('User already registered')) {
                  errorMessage = 'Este email já está cadastrado. Tente fazer login.';
                } else if (authError.message.includes('password') || authError.message.includes('Password')) {
                  errorMessage = 'A senha não atende aos requisitos de segurança.';
                } else if (authError.message.includes('email') || authError.message.includes('Email')) {
                  errorMessage = 'Email inválido. Verifique o formato.';
                } else {
                  errorMessage = `Erro de validação: ${authError.message || 'Verifique os dados e tente novamente'}`;
                }
              } else if (authError.status === 400) {
                errorMessage = 'Dados inválidos. Verifique email e senha.';
              } else {
                errorMessage = authError.message || 'Erro ao criar conta. Tente novamente.';
              }
              
              console.error('Erro ao registrar usuário:', authError);
              throw new Error(errorMessage);
            }

            if (authData.user) {
              console.log('✅ [AuthStore] Usuário criado no Supabase:', {
                userId: authData.user.id,
                email: authData.user.email,
              });

              // O perfil será criado automaticamente pelo trigger
              // Mas vamos aguardar um pouco e atualizar com o telefone
              console.log('⏳ [AuthStore] Aguardando criação do perfil...');
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Atualiza o perfil com o telefone
              if (phone) {
                console.log('📞 [AuthStore] Atualizando perfil com telefone:', phone);
                const { error: updateError } = await supabase
                  .from('user_profiles')
                  .update({ phone: phone })
                  .eq('id', authData.user.id);
                
                if (updateError) {
                  console.warn('⚠️ [AuthStore] Erro ao atualizar telefone no perfil:', updateError);
                } else {
                  console.log('✅ [AuthStore] Telefone atualizado no perfil');
                }
              }

              const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

              const userType = profile?.user_type === 'admin' ? 'admin' : (profile?.user_type as any) || 'common';
              const isAdmin = userType === 'admin' || profile?.user_type === 'admin';

              const user: User = {
                id: authData.user.id,
                email: authData.user.email!,
                name: profile?.name || name,
                phone: profile?.phone || phone,
                photoURL: profile?.photo_url || undefined,
                userType: userType,
                createdAt: new Date(authData.user.created_at),
                isPremium: profile?.is_premium || false,
                premiumExpiresAt: profile?.premium_expires_at ? new Date(profile.premium_expires_at) : undefined,
                isAdmin: isAdmin,
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }
        } catch (error: any) {
          // Se Supabase não estiver configurado ou houver erro, usa mock
          if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
          } else {
            set({ isLoading: false });
            throw error;
          }
        }

        // Fallback para mock (compatibilidade)
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        if (mockUsers[email.toLowerCase()]) {
          set({ isLoading: false });
          throw new Error('Este email ja esta cadastrado');
        }
        
        const newUser: User = {
          id: convertToUUID('user_' + Date.now()),
          email: email.toLowerCase(),
          name,
          phone: phone,
          userType: 'common',
          createdAt: new Date(),
          isPremium: false,
        };
        
        mockUsers[email.toLowerCase()] = { password, user: newUser };
        
        set({
          user: newUser,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // Reenviar email de confirmação
      resendConfirmationEmail: async (email: string) => {
        if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
          throw new Error('Supabase não está configurado');
        }

        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.toLowerCase(),
        });

        if (error) {
          throw new Error(error.message || 'Erro ao reenviar email de confirmação');
        }
      },

      // Confirmar email com token
      confirmEmail: async (token: string) => {
        if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
          throw new Error('Supabase não está configurado');
        }

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        });

        if (error) {
          throw new Error(error.message || 'Erro ao confirmar email');
        }

        // Atualiza o estado do usuário
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, emailConfirmed: true },
          });
        }
      },

      // Verificar status de confirmação do email
      checkEmailConfirmation: async () => {
        if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
          return false;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const isConfirmed = user.email_confirmed_at !== null && user.email_confirmed_at !== undefined;
          
          // Atualiza o estado do usuário
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: { ...currentUser, emailConfirmed: isConfirmed },
            });
          }
          
          return isConfirmed;
        }
        
        return false;
      },

      // Logout
      logout: async () => {
        // Faz logout do Supabase se estiver usando
        if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          await supabase.auth.signOut();
        }

        set({
          user: null,
          isAuthenticated: false,
        });
      },

      // Atualiza dados do usuario
      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          });
        }
      },

      // Upgrade para premium
      upgradeToPremium: () => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser: User = {
            ...currentUser,
            userType: 'premium',
            isPremium: true,
            premiumExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          };
          set({ user: updatedUser });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Recarrega dados do usuário do banco
      refreshUser: async () => {
        const currentUser = get().user;
        if (!currentUser || !supabase) return;

        try {
          // Busca perfil atualizado do banco
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          if (error) {
            console.error('❌ [AuthStore] Erro ao recarregar perfil:', error);
            return;
          }

          // Atualiza userType e isAdmin corretamente
          const userType = (profile?.user_type as any) || 'common';
          const isAdmin = userType === 'admin' || userType === 'owner' || 
                         profile?.user_type === 'admin' || profile?.user_type === 'owner';

          const updatedUser: User = {
            ...currentUser,
            name: profile?.name || currentUser.name,
            phone: profile?.phone || currentUser.phone,
            photoURL: profile?.photo_url || currentUser.photoURL,
            userType: userType,
            isPremium: profile?.is_premium || false,
            premiumExpiresAt: profile?.premium_expires_at ? new Date(profile.premium_expires_at) : undefined,
            isAdmin: isAdmin,
          };

          set({ user: updatedUser });
          console.log('✅ [AuthStore] Perfil recarregado:', { userType, isAdmin });
        } catch (error) {
          console.error('❌ [AuthStore] Erro ao recarregar usuário:', error);
        }
      },
      }
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
