/** RFC-5322 simplified email check. Good enough for client-side validation. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** True when the string has at least one non-whitespace character. */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/** Minimum entropy: 8+ chars, at least one letter and one digit. */
export function isStrongEnoughPassword(value: string): boolean {
  return value.length >= 8 && /[a-zA-Z]/.test(value) && /\d/.test(value);
}

/** Returns true when `value` is a UUID v4. */
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuidV4(value: string): boolean {
  return UUID_V4_RE.test(value);
}
