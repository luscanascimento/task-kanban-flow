/**
 * Type-safe `Object.keys` that returns `Array<keyof T>` instead of `string[]`.
 * Use this instead of the built-in to keep key typing tight across the codebase.
 */
export function keys<T extends object>(obj: T): ReadonlyArray<keyof T> {
  // Cast through `unknown`: `keyof T` can narrow to `never` (e.g. bare `object`),
  // which TS considers non-overlapping with `string[]` under strict settings.
  return Object.keys(obj) as unknown as ReadonlyArray<keyof T>;
}

/**
 * Type-safe `Object.entries`.
 */
export function entries<T extends object>(obj: T): ReadonlyArray<readonly [keyof T, T[keyof T]]> {
  return Object.entries(obj) as unknown as ReadonlyArray<readonly [keyof T, T[keyof T]]>;
}

/**
 * Returns a shallow clone of `obj` with `overrides` applied. Use this for
 * immutable updates in signal-based stores. Performs a reference equality
 * check and returns the original reference when nothing changed.
 */
export function patch<T extends object>(obj: T, overrides: Partial<T>): T {
  let changed = false;
  for (const key of Object.keys(overrides) as Array<keyof T>) {
    if (!Object.is(obj[key], overrides[key])) {
      changed = true;
      break;
    }
  }
  return changed ? { ...obj, ...overrides } : obj;
}

/** Picks a subset of keys from an object — useful when projecting DTOs. */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keysToPick: ReadonlyArray<K>,
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keysToPick) {
    out[key] = obj[key];
  }
  return out;
}
