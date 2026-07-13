import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { ProjectSecretDto } from '@tkf/shared-types';

interface SecretsState {
  secrets: ReadonlyArray<ProjectSecretDto>;
  isLoading: boolean;
  error: string | null;
}

const initialState: SecretsState = { secrets: [], isLoading: false, error: null };

/** Feature-scoped store for a board's secrets vault. */
export const SecretsStore = signalStore(
  withState(initialState),
  withComputed(({ secrets }) => ({
    count: computed(() => secrets().length),
    isEmpty: computed(() => secrets().length === 0),
  })),
  withMethods((store) => ({
    setSecrets(secrets: ReadonlyArray<ProjectSecretDto>): void {
      patchState(store, { secrets, isLoading: false, error: null });
    },
    upsert(secret: ProjectSecretDto): void {
      const exists = store.secrets().some((s) => s.id === secret.id);
      const secrets = exists
        ? store.secrets().map((s) => (s.id === secret.id ? secret : s))
        : [...store.secrets(), secret];
      patchState(store, { secrets });
    },
    remove(id: string): void {
      patchState(store, { secrets: store.secrets().filter((s) => s.id !== id) });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  })),
);
