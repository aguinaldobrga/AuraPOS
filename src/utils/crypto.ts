const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

/**
 * Gera um hash seguro para o PIN usando PBKDF2 + SHA-256.
 *
 * O resultado contém:
 * pbkdf2$iterações$salt$hash
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();

  // Gera um salt aleatório exclusivo para este PIN
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Cria o material da chave a partir do PIN
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Deriva o hash usando PBKDF2 + SHA-256
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  const hash = new Uint8Array(derivedBits);

  const saltHex = Array.from(salt)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  const hashHex = Array.from(hash)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

/**
 * Verifica um PIN comparando-o com o hash PBKDF2 armazenado.
 */
export async function verifyPin(
  pin: string,
  storedPin: string
): Promise<boolean> {
  try {
    const parts = storedPin.split('$');

    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false;
    }

    const [, iterationsString, saltHex, storedHashHex] = parts;
    const iterations = Number(iterationsString);

    if (!Number.isInteger(iterations) || iterations <= 0) {
      return false;
    }

    if (saltHex.length !== SALT_LENGTH * 2) {
      return false;
    }

    if (storedHashHex.length !== HASH_LENGTH * 2) {
      return false;
    }

    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) ?? []
    );

    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      HASH_LENGTH * 8
    );

    const hash = new Uint8Array(derivedBits);

    const hashHex = Array.from(hash)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    return hashHex === storedHashHex;
  } catch {
    return false;
  }
}