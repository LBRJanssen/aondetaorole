/**
 * Módulo de debug para logging durante desenvolvimento
 * Fornece funções organizadas por categoria para facilitar o debug
 */

// Configuração de debug (pode ser controlada por variável de ambiente)
const DEBUG_ENABLED = process.env.NODE_ENV === 'development';

/**
 * Log helper que só executa em desenvolvimento
 */
const debugLog = (category: string, action: string, data?: any) => {
  if (DEBUG_ENABLED) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEBUG:${category}] ${action}`, data || '');
  }
};

/**
 * Debug de UI - Interações com interface do usuário
 */
export const debugUI = {
  /**
   * Log quando um modal é aberto
   */
  modalOpen: (modalName: string) => {
    debugLog('UI', `Modal aberto: ${modalName}`);
  },

  /**
   * Log quando um botão é clicado
   */
  buttonClick: (buttonName: string, context?: string) => {
    debugLog('UI', `Botão clicado: ${buttonName}`, context ? { context } : undefined);
  },

  /**
   * Log quando uma página é carregada
   */
  pageLoad: (pageName: string) => {
    debugLog('UI', `Página carregada: ${pageName}`);
  },
};

/**
 * Debug de Eventos - Operações relacionadas a eventos
 */
export const debugEvents = {
  /**
   * Log quando uma interação com evento é iniciada
   */
  interactionStart: (type: string, eventId: string) => {
    debugLog('EVENTS', `Interação iniciada: ${type}`, { eventId });
  },

  /**
   * Log quando uma interação com evento é bem-sucedida
   */
  interactionSuccess: (type: string, eventId: string) => {
    debugLog('EVENTS', `Interação bem-sucedida: ${type}`, { eventId });
  },

  /**
   * Log quando a deleção de evento é iniciada
   */
  deleteStart: (eventId: string) => {
    debugLog('EVENTS', 'Deleção de evento iniciada', { eventId });
  },

  /**
   * Log quando a deleção de evento é bem-sucedida
   */
  deleteSuccess: (eventId: string) => {
    debugLog('EVENTS', 'Deleção de evento bem-sucedida', { eventId });
  },

  /**
   * Log quando ocorre erro na deleção de evento
   */
  deleteError: (error: any) => {
    debugLog('EVENTS', 'Erro na deleção de evento', { error: error?.message || error });
  },
};

/**
 * Debug de Carteira - Operações relacionadas à carteira digital
 */
export const debugWallet = {
  /**
   * Log quando há saldo insuficiente
   */
  insufficientFunds: (required: number, balance: number) => {
    debugLog('WALLET', 'Saldo insuficiente', { required, balance, deficit: required - balance });
  },

  /**
   * Log quando uma compra é iniciada
   */
  purchaseStart: (eventName: string, price: number) => {
    debugLog('WALLET', 'Compra iniciada', { eventName, price });
  },

  /**
   * Log quando uma compra é bem-sucedida
   */
  purchaseSuccess: (eventName: string, price: number) => {
    debugLog('WALLET', 'Compra bem-sucedida', { eventName, price });
  },

  /**
   * Log quando ocorre erro na compra
   */
  purchaseError: (error: any) => {
    debugLog('WALLET', 'Erro na compra', { error: error?.message || error });
  },
};

/**
 * Debug de Autenticação - Operações de login/logout
 */
export const debugAuth = {
  /**
   * Log quando login é iniciado
   */
  loginStart: (identifier: string) => {
    debugLog('AUTH', 'Login iniciado', { identifier });
  },

  /**
   * Log quando login é bem-sucedido
   */
  loginSuccess: (userId: string, identifier: string) => {
    debugLog('AUTH', 'Login bem-sucedido', { userId, identifier });
  },

  /**
   * Log quando ocorre erro no login
   */
  loginError: (error: any) => {
    debugLog('AUTH', 'Erro no login', { error: error?.message || error });
  },
};

/**
 * Debug de Formulários - Validações e interações com formulários
 */
export const debugForm = {
  /**
   * Log de validação de campo
   */
  validation: (field: string, isValid: boolean, message?: string) => {
    debugLog('FORM', `Validação: ${field}`, { isValid, message });
  },
};

/**
 * Debug de Navegação - Redirecionamentos e navegação
 */
export const debugNavigation = {
  /**
   * Log quando ocorre redirecionamento
   */
  redirect: (reason: string, destination: string) => {
    debugLog('NAVIGATION', `Redirecionamento: ${reason}`, { destination });
  },

  /**
   * Log quando ocorre navegação
   */
  navigate: (from: string, to: string) => {
    debugLog('NAVIGATION', 'Navegação', { from, to });
  },
};

