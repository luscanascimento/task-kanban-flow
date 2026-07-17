import { randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from './password';
import { encryptSecret, decryptSecret } from './encryption';
import { generateApiKey, hashApiKey, hashesEqual, looksLikeApiKey } from './api-key';

const PEPPER = 'test-pepper-value';

describe('password hashing (Argon2id + pepper)', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse', PEPPER);
    expect(await verifyPassword(hash, 'correct horse', PEPPER)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse', PEPPER);
    expect(await verifyPassword(hash, 'wrong horse', PEPPER)).toBe(false);
  });

  it('rejects a correct password under a different pepper (pepper is required)', async () => {
    const hash = await hashPassword('correct horse', PEPPER);
    expect(await verifyPassword(hash, 'correct horse', 'other-pepper')).toBe(false);
  });

  it('produces distinct hashes for the same password (random salt)', async () => {
    const a = await hashPassword('same', PEPPER);
    const b = await hashPassword('same', PEPPER);
    expect(a).not.toEqual(b);
  });

  it('never throws on a malformed stored hash', async () => {
    expect(await verifyPassword('not-a-hash', 'x', PEPPER)).toBe(false);
  });
});

describe('AES-256-GCM secret encryption', () => {
  const key = randomBytes(32);

  it('round-trips a value', () => {
    const envelope = encryptSecret('s3cr3t-value', key);
    expect(envelope).not.toContain('s3cr3t-value');
    expect(decryptSecret(envelope, key)).toBe('s3cr3t-value');
  });

  it('fails to decrypt under the wrong key', () => {
    const envelope = encryptSecret('value', key);
    expect(() => decryptSecret(envelope, randomBytes(32))).toThrow();
  });

  it('detects tampering (auth tag)', () => {
    const envelope = encryptSecret('value', key);
    const parts = envelope.split('.');
    const tampered = [parts[0], parts[1], parts[2], Buffer.from('evil').toString('base64url')].join(
      '.',
    );
    expect(() => decryptSecret(tampered, key)).toThrow();
  });
});

describe('API keys', () => {
  it('generates a tkf_ prefixed key whose stored form is a hash, not the key', () => {
    const key = generateApiKey(PEPPER);
    expect(looksLikeApiKey(key.plaintext)).toBe(true);
    expect(key.hash).not.toContain(key.plaintext);
    expect(key.display.startsWith('tkf_')).toBe(true);
  });

  it('hashes deterministically for lookup', () => {
    const key = generateApiKey(PEPPER);
    expect(hashApiKey(key.plaintext, PEPPER)).toBe(key.hash);
  });

  it('compares hex hashes in constant time', () => {
    expect(hashesEqual('abcd', 'abcd')).toBe(true);
    expect(hashesEqual('abcd', 'abce')).toBe(false);
    expect(hashesEqual('abcd', 'ab')).toBe(false); // different lengths
  });
});
