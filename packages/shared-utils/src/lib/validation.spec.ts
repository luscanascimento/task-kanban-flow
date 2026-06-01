import { isEmail, isNonEmpty, isStrongEnoughPassword, isUuidV4 } from './validation';

describe('validation utilities', () => {
  describe('isEmail', () => {
    it.each(['a@b.co', 'user.name+tag@sub.example.com'])('accepts %s', (value) => {
      expect(isEmail(value)).toBe(true);
    });
    it.each(['', 'no-at-sign', 'a@b', 'a b@c.com'])('rejects %s', (value) => {
      expect(isEmail(value)).toBe(false);
    });
  });

  describe('isNonEmpty', () => {
    it('rejects whitespace-only strings', () => {
      expect(isNonEmpty('   \t')).toBe(false);
    });
    it('accepts trimmed strings', () => {
      expect(isNonEmpty('  x  ')).toBe(true);
    });
  });

  describe('isStrongEnoughPassword', () => {
    it.each(['Abcdef12', 'p@ssw0rd'])('accepts %s', (value) => {
      expect(isStrongEnoughPassword(value)).toBe(true);
    });
    it.each(['short', 'onlyletters', '12345678'])('rejects %s', (value) => {
      expect(isStrongEnoughPassword(value)).toBe(false);
    });
  });

  describe('isUuidV4', () => {
    it('accepts a valid v4 uuid', () => {
      expect(isUuidV4('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });
    it('rejects non-v4 uuids', () => {
      expect(isUuidV4('f47ac10b-58cc-3372-a567-0e02b2c3d479')).toBe(false);
    });
    it('rejects random strings', () => {
      expect(isUuidV4('not-a-uuid')).toBe(false);
    });
  });
});
