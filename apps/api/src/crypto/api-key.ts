import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * API key generation and verification.
 *
 * A key is shown to the user exactly once at creation: `tkf_<43 base64url
 * chars>` (32 bytes of entropy). The server stores only a keyed SHA-256 hash
 * (HMAC with the API-key pepper), never the raw key. Lookups hash the presented
 * key and compare in constant time, so the database never holds a usable
 * credential.
 */
const PREFIX = 'tkf_';
/** Stored/displayed identifier: prefix + first 8 chars of the random part. */
const DISPLAY_LEN = PREFIX.length + 8;

export interface GeneratedApiKey {
  /** Full plaintext key — returned to the caller ONCE, never persisted. */
  readonly plaintext: string;
  /** Keyed hash to persist. */
  readonly hash: string;
  /** Short non-secret prefix for display in lists, e.g. `tkf_9f3ab21c`. */
  readonly display: string;
}

export function hashApiKey(plaintext: string, pepperSecret: string): string {
  return createHmac('sha256', pepperSecret).update(plaintext, 'utf8').digest('hex');
}

export function generateApiKey(pepperSecret: string): GeneratedApiKey {
  const plaintext = PREFIX + randomBytes(32).toString('base64url');
  return {
    plaintext,
    hash: hashApiKey(plaintext, pepperSecret),
    display: plaintext.slice(0, DISPLAY_LEN),
  };
}

/** Constant-time comparison of two hex-encoded hashes. */
export function hashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function looksLikeApiKey(token: string): boolean {
  return token.startsWith(PREFIX);
}
