// Criptografa/Gera Hash SHA-256 para o PIN usando Web Crypto API nativa do navegador
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Transforma os bytes em string Hexadecimal
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}