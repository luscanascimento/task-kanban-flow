import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { createHmac } from 'node:crypto';

/**
 * Password hashing: Argon2id (memory-hard) with a per-hash random salt handled
 * internally by Argon2, PLUS a server-side pepper.
 *
 * The pepper is applied by pre-hashing the password with HMAC-SHA256 keyed by
 * the pepper before it ever reaches Argon2. This keeps the pepper out of the
 * database entirely: even with a full DB dump, an attacker cannot mount an
 * offline attack without also stealing the pepper from the app's environment.
 *
 * OWASP-aligned Argon2id parameters (>= 19 MiB memory, t=2, p=1).
 */
// @node-rs/argon2 defaults to the Argon2id variant; we set OWASP-aligned
// cost parameters (>= 19 MiB memory, t=2, p=1).
const ARGON2_OPTIONS = {
  memoryCost: 19_456, // KiB (19 MiB)
  timeCost: 2,
  parallelism: 1,
} as const;

function pepper(password: string, pepperSecret: string): string {
  return createHmac('sha256', pepperSecret).update(password, 'utf8').digest('base64');
}

export async function hashPassword(password: string, pepperSecret: string): Promise<string> {
  return argonHash(pepper(password, pepperSecret), ARGON2_OPTIONS);
}

export async function verifyPassword(
  storedHash: string,
  password: string,
  pepperSecret: string,
): Promise<boolean> {
  try {
    return await argonVerify(storedHash, pepper(password, pepperSecret));
  } catch {
    // Malformed hash or verification error — treat as a non-match, never throw
    // into the auth path.
    return false;
  }
}
