/**
 * Build an optional DTO property only when it has a value.
 *
 * With `exactOptionalPropertyTypes`, writing `{ key: undefined }` is a type
 * error for an optional field. This helper yields either `{ key: value }` or
 * `{}`, so callers can spread it: `{ ...opt('avatarUrl', row.avatar_url) }`.
 */
export function opt<K extends string, V>(
  key: K,
  value: V | null | undefined,
): Record<K, V> | Record<string, never> {
  return value === null || value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}

/** SQLite stores booleans as 0/1. */
export function toBool(value: number): boolean {
  return value !== 0;
}
