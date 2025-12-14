// ============================================
// UTILITÁRIO PARA GERAR E CONVERTER UUIDs
// ============================================

/**
 * Gera um UUID v4 válido
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Converte um ID antigo (user_XXX) para UUID válido
 * Mantém consistência usando hash do ID original
 */
export function convertToUUID(oldId: string): string {
  // Se já é um UUID válido, retorna como está
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(oldId)) {
    return oldId;
  }

  // Gera UUID determinístico baseado no ID antigo
  // Isso garante que o mesmo ID antigo sempre gere o mesmo UUID
  let hash = 0;
  for (let i = 0; i < oldId.length; i++) {
    const char = oldId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Converte hash para UUID v4
  const hex = Math.abs(hash).toString(16).padStart(32, '0');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(13, 16),
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.substring(17, 20),
    hex.substring(20, 32),
  ].join('-');
}

/**
 * Converte UUID para formato legível (opcional)
 */
export function formatUUID(uuid: string): string {
  return uuid;
}

