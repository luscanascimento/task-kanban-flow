import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { ApiKeyDto } from '@tkf/shared-types';

interface ApiKeysState {
  keys: ReadonlyArray<ApiKeyDto>;
  isLoading: boolean;
  error: string | null;
}

const initialState: ApiKeysState = { keys: [], isLoading: false, error: null };

/** Feature-scoped store for the signed-in user's API keys. */
export const ApiKeysStore = signalStore(
  withState(initialState),
  withComputed(({ keys }) => ({
    activeKeys: computed(() => keys().filter((k) => !k.revoked)),
    isEmpty: computed(() => keys().length === 0),
  })),
  withMethods((store) => ({
    setKeys(keys: ReadonlyArray<ApiKeyDto>): void {
      patchState(store, { keys, isLoading: false, error: null });
    },
    upsert(key: ApiKeyDto): void {
      const exists = store.keys().some((k) => k.id === key.id);
      const keys = exists
        ? store.keys().map((k) => (k.id === key.id ? key : k))
        : [key, ...store.keys()];
      patchState(store, { keys });
    },
    markRevoked(id: string): void {
      patchState(store, {
        keys: store.keys().map((k) => (k.id === id ? { ...k, revoked: true } : k)),
      });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  })),
);
