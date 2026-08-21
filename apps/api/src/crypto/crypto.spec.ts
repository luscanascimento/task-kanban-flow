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

  it('rejects a flipped bit in the auth tag itself', () => {
    const [version, iv, tag, ciphertext] = encryptSecret('value', key).split('.') as [
      string,
      string,
      string,
      string,
    ];
    const tagBytes = Buffer.from(tag, 'base64url');
    tagBytes.writeUInt8(tagBytes.readUInt8(0) ^ 0xff, 0);
    const tampered = [version, iv, tagBytes.toString('base64url'), ciphertext].join('.');
    expect(tampered).not.toBe(encryptSecret('value', key));
    expect(() => decryptSecret(tampered, key)).toThrow();
  });

  it('never emits the same envelope twice for the same input (random IV)', () => {
    const a = encryptSecret('same', key);
    const b = encryptSecret('same', key);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, key)).toBe(decryptSecret(b, key));
  });

  it('tags every envelope with the v1 version marker', () => {
    expect(encryptSecret('value', key).split('.')).toHaveLength(4);
    expect(encryptSecret('value', key).startsWith('v1.')).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['plain text, no envelope', 'just-a-secret'],
    ['too few segments', 'v1.aaaa.bbbb'],
    ['too many segments', 'v1.aaaa.bbbb.cccc.dddd'],
    ['unknown version', 'v2.aaaa.bbbb.cccc'],
    ['missing version marker', 'aaaa.bbbb.cccc.dddd'],
  ])('rejects a malformed envelope: %s', (_case, envelope) => {
    expect(() => decryptSecret(envelope, key)).toThrow('Malformed secret envelope');
  });

  it('rejects a well-formed v1 envelope carrying a truncated IV', () => {
    const [version, , tag, ciphertext] = encryptSecret('value', key).split('.') as [
      string,
      string,
      string,
      string,
    ];
    const shortIv = Buffer.alloc(4).toString('base64url');
    expect(() => decryptSecret([version, shortIv, tag, ciphertext].join('.'), key)).toThrow();
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

  it('emits tkf_ + 43 base64url chars (32 bytes of entropy)', () => {
    expect(generateApiKey(PEPPER).plaintext).toMatch(/^tkf_[A-Za-z0-9_-]{43}$/);
  });

  it('never repeats a key', () => {
    const plaintexts = new Set(Array.from({ length: 200 }, () => generateApiKey(PEPPER).plaintext));
    expect(plaintexts.size).toBe(200);
  });

  it('stores a SHA-256 digest, from which the key cannot be read back', () => {
    const key = generateApiKey(PEPPER);
    expect(key.hash).toMatch(/^[0-9a-f]{64}$/);
    // The random part of the key appears nowhere in the stored form.
    expect(key.hash).not.toContain(key.plaintext.slice('tkf_'.length));
  });

  it('binds the hash to the pepper, so a stolen database cannot verify guesses', () => {
    const key = generateApiKey(PEPPER);
    expect(hashApiKey(key.plaintext, 'attacker-pepper')).not.toBe(key.hash);
    expect(hashesEqual(hashApiKey(key.plaintext, 'attacker-pepper'), key.hash)).toBe(false);
  });

  it('keeps the display prefix non-secret: it cannot reproduce the stored hash', () => {
    const key = generateApiKey(PEPPER);
    expect(key.display).toHaveLength('tkf_'.length + 8);
    expect(key.plaintext.startsWith(key.display)).toBe(true);
    expect(key.plaintext).not.toBe(key.display);
    expect(hashApiKey(key.display, PEPPER)).not.toBe(key.hash);
  });

  it('does not mistake a JWT for an API key', () => {
    expect(looksLikeApiKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.sig')).toBe(false);
    expect(looksLikeApiKey('')).toBe(false);
  });
});
