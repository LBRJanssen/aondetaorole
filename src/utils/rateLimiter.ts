/**
 * Rate Limiter - Previne ataques de força bruta e spam
 * Usa localStorage para rastrear tentativas por IP/identificador
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

interface RateLimitConfig {
  maxAttempts: number; // Número máximo de tentativas
  windowMs: number; // Janela de tempo em milissegundos
  blockDurationMs: number; // Duração do bloqueio em milissegundos
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5, // 5 tentativas
  windowMs: 15 * 60 * 1000, // 15 minutos
  blockDurationMs: 30 * 60 * 1000, // 30 minutos de bloqueio
};

/**
 * Gera um identificador único para o usuário (baseado em IP ou user agent)
 */
function getIdentifier(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  // Tenta usar localStorage para criar um ID persistente
  let identifier = localStorage.getItem('rate_limit_id');
  if (!identifier) {
    identifier = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('rate_limit_id', identifier);
  }
  
  return identifier;
}

/**
 * Limpa entradas antigas do rate limiter
 */
function cleanOldEntries() {
  if (typeof window === 'undefined') return;
  
  const now = Date.now();
  const entries = JSON.parse(localStorage.getItem('rate_limits') || '{}');
  const cleaned: Record<string, RateLimitEntry> = {};
  
  for (const [key, entry] of Object.entries(entries)) {
    const rateLimitEntry = entry as RateLimitEntry;
    // Mantém apenas entradas que ainda estão dentro da janela de tempo
    if (rateLimitEntry.resetTime > now) {
      cleaned[key] = rateLimitEntry;
    }
  }
  
  localStorage.setItem('rate_limits', JSON.stringify(cleaned));
}

/**
 * Verifica se uma ação está bloqueada por rate limiting
 * IMPORTANTE: Esta função NÃO incrementa o contador, apenas verifica o status
 * Use recordFailedAttempt() para registrar uma tentativa falha
 */
export function checkRateLimit(
  action: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; remainingAttempts: number; resetTime: number | null; error?: string } {
  if (typeof window === 'undefined') {
    return { allowed: true, remainingAttempts: config.maxAttempts || DEFAULT_CONFIG.maxAttempts, resetTime: null };
  }

  cleanOldEntries();

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const identifier = getIdentifier();
  const key = `${action}_${identifier}`;
  
  const entries = JSON.parse(localStorage.getItem('rate_limits') || '{}');
  const entry: RateLimitEntry = entries[key] || {
    count: 0,
    resetTime: Date.now() + finalConfig.windowMs,
    blocked: false,
  };

  const now = Date.now();

  // Se está bloqueado, verifica se o bloqueio expirou
  if (entry.blocked) {
    if (now < entry.resetTime) {
      const remainingBlockTime = Math.ceil((entry.resetTime - now) / 1000 / 60);
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.resetTime,
        error: `Muitas tentativas. Tente novamente em ${remainingBlockTime} minutos.`,
      };
    } else {
      // Bloqueio expirou, reseta
      entry.blocked = false;
      entry.count = 0;
      entry.resetTime = now + finalConfig.windowMs;
      entries[key] = entry;
      localStorage.setItem('rate_limits', JSON.stringify(entries));
    }
  }

  // Se a janela de tempo expirou, reseta o contador
  if (now >= entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + finalConfig.windowMs;
    entries[key] = entry;
    localStorage.setItem('rate_limits', JSON.stringify(entries));
  }

  // Verifica se excedeu o limite (sem incrementar contador)
  if (entry.count >= finalConfig.maxAttempts) {
    const remainingBlockTime = Math.ceil(finalConfig.blockDurationMs / 1000 / 60);
    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: entry.resetTime,
      error: `Muitas tentativas. Conta bloqueada por ${remainingBlockTime} minutos.`,
    };
  }

  // Retorna status sem incrementar contador
  return {
    allowed: true,
    remainingAttempts: finalConfig.maxAttempts - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Registra uma tentativa falha (para rate limiting mais rigoroso)
 */
export function recordFailedAttempt(action: string, config: Partial<RateLimitConfig> = {}) {
  if (typeof window === 'undefined') return;
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const identifier = getIdentifier();
  const key = `${action}_${identifier}`;
  
  const entries = JSON.parse(localStorage.getItem('rate_limits') || '{}');
  const entry: RateLimitEntry = entries[key] || {
    count: 0,
    resetTime: Date.now() + finalConfig.windowMs,
    blocked: false,
  };

  const now = Date.now();

  // Se a janela de tempo expirou, reseta
  if (now >= entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + finalConfig.windowMs;
  }

  // Incrementa contador de falhas
  entry.count++;
  
  // Se excedeu o limite, bloqueia
  if (entry.count >= finalConfig.maxAttempts) {
    entry.blocked = true;
    entry.resetTime = now + finalConfig.blockDurationMs;
  }

  entries[key] = entry;
  localStorage.setItem('rate_limits', JSON.stringify(entries));
}

/**
 * Registra uma tentativa bem-sucedida (reseta o contador)
 */
export function recordSuccess(action: string) {
  if (typeof window === 'undefined') return;
  
  const identifier = getIdentifier();
  const key = `${action}_${identifier}`;
  
  const entries = JSON.parse(localStorage.getItem('rate_limits') || '{}');
  
  // Remove a entrada para esta ação
  if (entries[key]) {
    delete entries[key];
    localStorage.setItem('rate_limits', JSON.stringify(entries));
  }
}

/**
 * Limpa todas as entradas de rate limiting (útil para testes)
 */
export function clearRateLimits() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rate_limits');
}

