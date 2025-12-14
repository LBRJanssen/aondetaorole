/**
 * Utilitários de validação e sanitização
 */

/**
 * Sanitiza uma string removendo tags HTML e caracteres perigosos
 * Previne XSS (Cross-Site Scripting)
 * Preserva espaços entre palavras
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove tags HTML
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove caracteres perigosos (mas preserva espaços)
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Remove caracteres de controle (mas preserva espaços normais)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove apenas espaços no início e fim, preserva espaços no meio
  return sanitized.trim();
}

/**
 * Valida nome do evento
 */
export function validateEventName(name: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(name);
  
  if (!sanitized || sanitized.trim().length === 0) {
    return { valid: false, error: 'Nome do evento é obrigatório' };
  }
  
  if (sanitized.length < 3) {
    return { valid: false, error: 'Nome deve ter pelo menos 3 caracteres' };
  }
  
  if (sanitized.length > 100) {
    return { valid: false, error: 'Nome deve ter no máximo 100 caracteres' };
  }
  
  return { valid: true };
}

/**
 * Valida descrição do evento
 */
export function validateDescription(description: string): { valid: boolean; error?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: true }; // Descrição é opcional
  }
  
  const sanitized = sanitizeInput(description);
  
  if (sanitized.length < 10) {
    return { valid: false, error: 'Descrição deve ter pelo menos 10 caracteres' };
  }
  
  if (sanitized.length > 2000) {
    return { valid: false, error: 'Descrição deve ter no máximo 2000 caracteres' };
  }
  
  return { valid: true };
}

/**
 * Valida URL de imagem
 */
export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim().length === 0) {
    return { valid: true }; // URL é opcional (usa imagem padrão)
  }
  
  const sanitized = sanitizeInput(url);
  
  // Verifica se é uma URL válida
  try {
    const urlObj = new URL(sanitized);
    
    // Verifica se é http ou https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return { valid: false, error: 'URL deve começar com http:// ou https://' };
    }
    
    // Verifica extensões de imagem válidas
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const pathname = urlObj.pathname.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
    
    // Se não tiver extensão, pode ser uma URL de API (ex: Unsplash)
    // Nesse caso, apenas verifica se é uma URL válida
    if (!hasValidExtension && !pathname.includes('/photo/') && !pathname.includes('/images/')) {
      // Permite URLs sem extensão explícita (ex: APIs de imagem)
      // Mas valida que é uma URL válida
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'URL inválida' };
  }
}

/**
 * Valida telefone brasileiro
 * Formatos aceitos:
 * - (11) 99999-9999
 * - (11) 9999-9999
 * - 11999999999
 * - 1199999999
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: 'Telefone é obrigatório' };
  }
  
  // Remove todos os caracteres não numéricos
  const numbersOnly = phone.replace(/\D/g, '');
  
  // Verifica se tem 10 ou 11 dígitos (com ou sem DDD)
  if (numbersOnly.length < 10) {
    return { valid: false, error: 'Telefone deve ter pelo menos 10 dígitos' };
  }
  
  if (numbersOnly.length > 11) {
    return { valid: false, error: 'Telefone deve ter no máximo 11 dígitos' };
  }
  
  // Verifica se começa com DDD válido (11-99)
  const ddd = numbersOnly.substring(0, 2);
  const dddNum = parseInt(ddd);
  
  if (dddNum < 11 || dddNum > 99) {
    return { valid: false, error: 'DDD inválido. Use um DDD válido (11-99)' };
  }
  
  // Verifica se o número do telefone é válido
  // Celular: 9 dígitos após DDD (total 11)
  // Fixo: 8 dígitos após DDD (total 10)
  if (numbersOnly.length === 11) {
    // Celular - primeiro dígito deve ser 9
    const firstDigit = numbersOnly.substring(2, 3);
    if (firstDigit !== '9') {
      return { valid: false, error: 'Número de celular deve começar com 9' };
    }
  } else if (numbersOnly.length === 10) {
    // Fixo - primeiro dígito deve ser 2-9
    const firstDigit = numbersOnly.substring(2, 3);
    if (firstDigit < '2' || firstDigit > '9') {
      return { valid: false, error: 'Número de telefone fixo inválido' };
    }
  }
  
  return { valid: true };
}

/**
 * Formata telefone brasileiro para exibição
 * (11) 99999-9999 ou (11) 9999-9999
 */
export function formatPhone(phone: string): string {
  const numbersOnly = phone.replace(/\D/g, '');
  
  if (numbersOnly.length === 11) {
    // Celular: (XX) 9XXXX-XXXX
    return `(${numbersOnly.substring(0, 2)}) ${numbersOnly.substring(2, 7)}-${numbersOnly.substring(7)}`;
  } else if (numbersOnly.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${numbersOnly.substring(0, 2)}) ${numbersOnly.substring(2, 6)}-${numbersOnly.substring(6)}`;
  }
  
  return phone; // Retorna original se não conseguir formatar
}

/**
 * Aplica máscara de telefone enquanto o usuário digita
 */
export function applyPhoneMask(value: string): string {
  const numbersOnly = value.replace(/\D/g, '');
  
  if (numbersOnly.length <= 2) {
    return numbersOnly.length > 0 ? `(${numbersOnly}` : '';
  } else if (numbersOnly.length <= 7) {
    return `(${numbersOnly.substring(0, 2)}) ${numbersOnly.substring(2)}`;
  } else if (numbersOnly.length <= 10) {
    return `(${numbersOnly.substring(0, 2)}) ${numbersOnly.substring(2, 6)}-${numbersOnly.substring(6)}`;
  } else {
    // Celular: (XX) 9XXXX-XXXX
    return `(${numbersOnly.substring(0, 2)}) ${numbersOnly.substring(2, 7)}-${numbersOnly.substring(7, 11)}`;
  }
}

/**
 * Valida CEP brasileiro
 */
export function validateCep(cep: string): { valid: boolean; error?: string } {
  if (!cep || cep.trim().length === 0) {
    return { valid: false, error: 'CEP é obrigatório' };
  }
  
  const numbersOnly = cep.replace(/\D/g, '');
  
  if (numbersOnly.length !== 8) {
    return { valid: false, error: 'CEP deve ter 8 dígitos' };
  }
  
  return { valid: true };
}

/**
 * Valida capacidade máxima
 */
export function validateMaxCapacity(capacity: string): { valid: boolean; error?: string } {
  if (!capacity || capacity.trim().length === 0) {
    return { valid: false, error: 'Capacidade máxima é obrigatória' };
  }
  
  const num = parseInt(capacity);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Capacidade deve ser um número' };
  }
  
  if (num < 1) {
    return { valid: false, error: 'Capacidade deve ser maior que 0' };
  }
  
  if (num > 100000) {
    return { valid: false, error: 'Capacidade máxima é 100.000 pessoas' };
  }
  
  return { valid: true };
}

/**
 * Valida idade mínima
 */
export function validateAgeMin(age: string): { valid: boolean; error?: string } {
  if (!age || age.trim().length === 0) {
    return { valid: false, error: 'Idade mínima é obrigatória' };
  }
  
  const num = parseInt(age);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Idade deve ser um número' };
  }
  
  if (num < 0) {
    return { valid: false, error: 'Idade mínima não pode ser negativa' };
  }
  
  if (num > 100) {
    return { valid: false, error: 'Idade mínima não pode ser maior que 100' };
  }
  
  return { valid: true };
}

/**
 * Valida idade máxima
 */
export function validateAgeMax(age: string, ageMin?: string): { valid: boolean; error?: string } {
  if (!age || age.trim().length === 0) {
    return { valid: true }; // Idade máxima é opcional
  }
  
  const num = parseInt(age);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Idade deve ser um número' };
  }
  
  if (num < 0) {
    return { valid: false, error: 'Idade máxima não pode ser negativa' };
  }
  
  if (num > 100) {
    return { valid: false, error: 'Idade máxima não pode ser maior que 100' };
  }
  
  // Se tem idade mínima, valida que máxima é maior ou igual
  if (ageMin) {
    const minNum = parseInt(ageMin);
    if (!isNaN(minNum) && num < minNum) {
      return { valid: false, error: 'Idade máxima deve ser maior ou igual à idade mínima' };
    }
  }
  
  return { valid: true };
}

/**
 * Valida preço
 */
export function validatePrice(price: string, isFree: boolean): { valid: boolean; error?: string } {
  if (isFree) {
    return { valid: true }; // Preço não é necessário se for gratuito
  }
  
  if (!price || price.trim().length === 0) {
    return { valid: false, error: 'Preço é obrigatório para eventos pagos' };
  }
  
  const num = parseFloat(price);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Preço deve ser um número' };
  }
  
  if (num < 0) {
    return { valid: false, error: 'Preço não pode ser negativo' };
  }
  
  if (num > 100000) {
    return { valid: false, error: 'Preço máximo é R$ 100.000,00' };
  }
  
  return { valid: true };
}

/**
 * Valida tipo de evento customizado
 */
export function validateCustomEventType(type: string): { valid: boolean; error?: string } {
  if (!type || type.trim().length === 0) {
    return { valid: false, error: 'Digite o tipo de evento' };
  }
  
  const sanitized = sanitizeInput(type);
  
  if (sanitized.length < 2) {
    return { valid: false, error: 'Tipo de evento deve ter pelo menos 2 caracteres' };
  }
  
  if (sanitized.length > 50) {
    return { valid: false, error: 'Tipo de evento deve ter no máximo 50 caracteres' };
  }
  
  return { valid: true };
}

