/**
 * Group an array of items by a key derived from each item.
 * Returns an object whose keys are the return value of `keyFn` and whose
 * values are arrays of the items that produced that key. Items iterated in
 * input order.
 *
 * @example
 *   groupBy([{ n: 1 }, { n: 2 }, { n: 1 }], (x) => String(x.n))
 *   // => { '1': [{ n: 1 }, { n: 1 }], '2': [{ n: 2 }] }
 */
export function groupBy<T, K extends string | number>(
  items: ReadonlyArray<T>,
  keyFn: (item: T, index: number) => K,
): Record<K, ReadonlyArray<T>> {
  const out = {} as Record<K, T[]>;
  items.forEach((item, index) => {
    const key = keyFn(item, index);
    (out[key] ??= []).push(item);
  });
  return out as Record<K, ReadonlyArray<T>>;
}

/**
 * Returns a new array with duplicates removed. Equality uses `SameValueZero`
 * (matches `===` except `NaN === NaN`). Order is preserved (first occurrence
 * wins). For object deduplication, provide a `keyFn` to derive a primitive key.
 */
export function uniqueBy<T, K extends string | number | symbol>(
  items: ReadonlyArray<T>,
  keyFn: (item: T) => K = (item) => item as unknown as K,
): ReadonlyArray<T> {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** Partition an array into two arrays based on a predicate. */
export function partition<T>(
  items: ReadonlyArray<T>,
  predicate: (item: T, index: number) => boolean,
): readonly [ReadonlyArray<T>, ReadonlyArray<T>] {
  const pass: T[] = [];
  const fail: T[] = [];
  items.forEach((item, index) => {
    if (predicate(item, index)) pass.push(item);
    else fail.push(item);
  });
  return [pass, fail] as const;
}

/**
 * Move an item from `fromIndex` to `toIndex` and return a new array.
 * Does not mutate the input. Out-of-range indices throw.
 */
export function moveItem<T>(
  items: ReadonlyArray<T>,
  fromIndex: number,
  toIndex: number,
): ReadonlyArray<T> {
  if (fromIndex < 0 || fromIndex >= items.length) {
    throw new RangeError(`fromIndex ${fromIndex} out of bounds (length ${items.length})`);
  }
  if (toIndex < 0 || toIndex >= items.length) {
    throw new RangeError(`toIndex ${toIndex} out of bounds (length ${items.length})`);
  }
  if (fromIndex === toIndex) return items;
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  // The bounds check above guarantees an element; this guard narrows the
  // `T | undefined` from noUncheckedIndexedAccess without a non-null assertion.
  if (moved === undefined) return items;
  next.splice(toIndex, 0, moved);
  return next;
}
