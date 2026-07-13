import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { BoardDto, ClientDto } from '@tkf/shared-types';

interface ClientDetailState {
  client: ClientDto | null;
  boards: ReadonlyArray<BoardDto>;
  isLoading: boolean;
  error: string | null;
}

const initialState: ClientDetailState = { client: null, boards: [], isLoading: false, error: null };

/** Feature-scoped store for a single client view (its assigned boards). */
export const ClientDetailStore = signalStore(
  withState(initialState),
  withComputed(({ client, boards }) => ({
    hasBoards: computed(() => boards().length > 0),
    isReady: computed(() => client() !== null),
  })),
  withMethods((store) => ({
    setClient(client: ClientDto): void {
      patchState(store, { client });
    },
    setBoards(boards: ReadonlyArray<BoardDto>): void {
      patchState(store, { boards });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  })),
);
