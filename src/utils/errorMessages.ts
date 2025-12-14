/**
 * Utilitário para melhorar mensagens de erro
 * Converte erros técnicos em mensagens amigáveis e acionáveis
 */

export function getErrorMessage(error: any): string {
  // Se já for uma string amigável, retorna direto
  if (typeof error === 'string') {
    return error;
  }

  // Se for um objeto Error
  if (error instanceof Error) {
    const message = error.message;

    // Erros de rede/conexão
    if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';
    }

    // Erros de autenticação
    if (message.includes('auth') || message.includes('login') || message.includes('unauthorized')) {
      return 'Sua sessão expirou. Por favor, faça login novamente.';
    }

    // Erros de permissão
    if (message.includes('permission') || message.includes('forbidden') || message.includes('403')) {
      return 'Você não tem permissão para realizar esta ação.';
    }

    // Erros de validação
    if (message.includes('validation') || message.includes('invalid') || message.includes('422')) {
      return 'Os dados informados são inválidos. Verifique os campos e tente novamente.';
    }

    // Erros de servidor
    if (message.includes('500') || message.includes('server error') || message.includes('internal')) {
      return 'Ocorreu um erro no servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.';
    }

    // Erros de não encontrado
    if (message.includes('404') || message.includes('not found')) {
      return 'O recurso solicitado não foi encontrado.';
    }

    // Erros de senha do Supabase
    if (message.includes('New password should be different from the old password')) {
      return 'A nova senha deve ser diferente da senha atual.';
    }
    if (message.includes('Password should be at least')) {
      return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (message.includes('Password is too weak') || message.includes('weak password')) {
      return 'A senha é muito fraca. Use letras maiúsculas, minúsculas, números e caracteres especiais.';
    }
    if (message.includes('same_password') || message.includes('same password')) {
      return 'A nova senha não pode ser igual à senha anterior.';
    }

    // Erros do Supabase específicos
    if (message.includes('Supabase') || message.includes('supabase')) {
      if (message.includes('RLS') || message.includes('row-level security')) {
        return 'Você não tem permissão para acessar este recurso. Verifique suas permissões.';
      }
      if (message.includes('connection') || message.includes('timeout')) {
        return 'Não foi possível conectar ao banco de dados. Tente novamente mais tarde.';
      }
    }

    // Erros de UUID
    if (message.includes('uuid') || message.includes('invalid input syntax')) {
      return 'Erro ao processar os dados. Tente recarregar a página.';
    }

    // Retorna a mensagem original se não houver match
    return message || 'Ocorreu um erro inesperado. Tente novamente.';
  }

  // Se for um objeto com propriedades de erro
  if (error && typeof error === 'object') {
    // Erros do Supabase
    if (error.message) {
      return getErrorMessage(error.message);
    }

    if (error.error) {
      return getErrorMessage(error.error);
    }

    // Erros com código
    if (error.code) {
      switch (error.code) {
        case 'PGRST301':
          return 'Recurso não encontrado.';
        case 'PGRST116':
          return 'Nenhum resultado encontrado.';
        case '42501':
          return 'Você não tem permissão para realizar esta ação.';
        case '23505':
          return 'Este registro já existe.';
        case '23503':
          return 'Não é possível realizar esta ação devido a dependências.';
        default:
          return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
      }
    }
  }

  // Fallback
  return 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.';
}

/**
 * Mensagens de erro específicas para ações comuns
 */
export const ErrorMessages = {
  // Autenticação
  LOGIN_FAILED: 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.',
  SESSION_EXPIRED: 'Sua sessão expirou. Por favor, faça login novamente.',
  UNAUTHORIZED: 'Você precisa estar logado para realizar esta ação.',

  // Eventos
  EVENT_NOT_FOUND: 'Evento não encontrado. Ele pode ter sido removido.',
  EVENT_CREATE_FAILED: 'Não foi possível criar o evento. Verifique os dados e tente novamente.',
  EVENT_UPDATE_FAILED: 'Não foi possível atualizar o evento. Tente novamente.',
  EVENT_DELETE_FAILED: 'Não foi possível deletar o evento. Tente novamente.',
  EVENT_PERMISSION_DENIED: 'Você não tem permissão para editar ou deletar este evento.',

  // Usuário
  USER_NOT_FOUND: 'Usuário não encontrado.',
  PROFILE_UPDATE_FAILED: 'Não foi possível atualizar seu perfil. Tente novamente.',

  // Rede
  NETWORK_ERROR: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
  TIMEOUT: 'A operação demorou muito para responder. Tente novamente.',

  // Genérico
  UNEXPECTED_ERROR: 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.',
  TRY_AGAIN: 'Algo deu errado. Tente novamente.',
};

