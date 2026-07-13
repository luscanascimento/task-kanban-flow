import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { BoardDto } from '@tkf/shared-types';

interface BoardsState {
  boards: ReadonlyArray<BoardDto>;
  isLoading: boolean;
  error: string | null;
}

const initialState: BoardsState = {
  boards: [],
  isLoading: false,
  error: null,
};

/**
 * Feature-scoped store for the boards list. Provided at the boards route
 * (not root), so its lifecycle is tied to the lazily-loaded feature.
 */
export const BoardsStore = signalStore(
  withState(initialState),
  withComputed(({ boards }) => ({
    count: computed(() => boards().length),
    isEmpty: computed(() => boards().length === 0),
  })),
  withMethods((store) => ({
    setBoards(boards: ReadonlyArray<BoardDto>): void {
      patchState(store, { boards, isLoading: false, error: null });
    },
    upsertBoard(board: BoardDto): void {
      const existing = store.boards().some((b) => b.id === board.id);
      const boards = existing
        ? store.boards().map((b) => (b.id === board.id ? board : b))
        : [...store.boards(), board];
      patchState(store, { boards });
    },
    removeBoard(id: string): void {
      patchState(store, { boards: store.boards().filter((b) => b.id !== id) });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  })),
);
