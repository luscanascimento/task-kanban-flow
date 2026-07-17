import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Authenticated symmetric encryption for data at rest (the secrets vault).
 *
 * AES-256-GCM with a random 96-bit IV per message. The stored envelope is
 * `v1.<iv>.<authTag>.<ciphertext>` (all base64url). GCM's auth tag means any
 * tampering with the ciphertext is detected on decrypt and rejected.
 */
const VERSION = 'v1';
const IV_BYTES = 12;

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptSecret(envelope: string, key: Buffer): string {
  const parts = envelope.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Malformed secret envelope');
  }
  const iv = Buffer.from(parts[1] as string, 'base64url');
  const authTag = Buffer.from(parts[2] as string, 'base64url');
  const ciphertext = Buffer.from(parts[3] as string, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
