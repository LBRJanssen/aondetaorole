/**
 * CAPTCHA simples para prevenir bots
 * Implementação básica que pode ser substituída por Google reCAPTCHA no futuro
 */

interface CaptchaChallenge {
  question: string;
  answer: number;
}

/**
 * Gera um desafio matemático simples
 */
function generateMathChallenge(): CaptchaChallenge {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operation = Math.random() > 0.5 ? '+' : '-';
  
  let answer: number;
  let question: string;
  
  if (operation === '+') {
    answer = num1 + num2;
    question = `${num1} + ${num2}`;
  } else {
    // Garante que o resultado não seja negativo
    const max = Math.max(num1, num2);
    const min = Math.min(num1, num2);
    answer = max - min;
    question = `${max} - ${min}`;
  }
  
  return { question, answer };
}

/**
 * Armazena o desafio atual no sessionStorage
 */
function storeChallenge(challenge: CaptchaChallenge): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('captcha_challenge', JSON.stringify(challenge));
}

/**
 * Recupera o desafio atual do sessionStorage
 */
function getStoredChallenge(): CaptchaChallenge | null {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem('captcha_challenge');
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Limpa o desafio do sessionStorage
 */
function clearChallenge(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('captcha_challenge');
}

/**
 * Gera um novo desafio CAPTCHA
 */
export function generateCaptcha(): { question: string; answer: number } {
  const challenge = generateMathChallenge();
  storeChallenge(challenge);
  return { question: challenge.question, answer: challenge.answer };
}

/**
 * Valida a resposta do CAPTCHA
 */
export function validateCaptcha(userAnswer: string): boolean {
  const challenge = getStoredChallenge();
  if (!challenge) return false;
  
  const answer = parseInt(userAnswer.trim());
  if (isNaN(answer)) return false;
  
  const isValid = answer === challenge.answer;
  
  // Limpa o desafio após validação (sucesso ou falha)
  clearChallenge();
  
  return isValid;
}

/**
 * Verifica se há um desafio ativo
 */
export function hasActiveChallenge(): boolean {
  return getStoredChallenge() !== null;
}

