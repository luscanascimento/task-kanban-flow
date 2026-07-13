import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { ClientDto } from '@tkf/shared-types';

interface ClientsState {
  clients: ReadonlyArray<ClientDto>;
  isLoading: boolean;
  error: string | null;
}

const initialState: ClientsState = { clients: [], isLoading: false, error: null };

/** Feature-scoped store for the global clients list. */
export const ClientsStore = signalStore(
  withState(initialState),
  withComputed(({ clients }) => ({
    isEmpty: computed(() => clients().length === 0),
  })),
  withMethods((store) => ({
    setClients(clients: ReadonlyArray<ClientDto>): void {
      patchState(store, { clients, isLoading: false, error: null });
    },
    upsert(client: ClientDto): void {
      const exists = store.clients().some((c) => c.id === client.id);
      const clients = exists
        ? store.clients().map((c) => (c.id === client.id ? client : c))
        : [...store.clients(), client];
      patchState(store, { clients });
    },
    remove(id: string): void {
      patchState(store, { clients: store.clients().filter((c) => c.id !== id) });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  })),
);
