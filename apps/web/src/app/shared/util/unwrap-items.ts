/**
 * A list endpoint may respond either as a bare array (the MSW mock) or as a
 * `{ items: [...] }` envelope (the real `apps/api` backend). Adapters unwrap
 * with this helper so the app works against either backend unchanged.
 */
export type ListResponse<T> = ReadonlyArray<T> | { readonly items: ReadonlyArray<T> };

export function unwrapItems<T>(response: ListResponse<T>): ReadonlyArray<T> {
  // `'items' in` narrows the union cleanly (Array.isArray doesn't narrow
  // ReadonlyArray). A bare array has no `items` property.
  return 'items' in response ? response.items : response;
}
