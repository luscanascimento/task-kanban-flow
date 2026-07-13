import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { BoardDto, TeamDto } from '@tkf/shared-types';

interface TeamDetailState {
  team: TeamDto | null;
  boards: ReadonlyArray<BoardDto>;
  isLoading: boolean;
  error: string | null;
}

const initialState: TeamDetailState = { team: null, boards: [], isLoading: false, error: null };

/** Feature-scoped store for a single team view (its boards + members). */
export const TeamDetailStore = signalStore(
  withState(initialState),
  withComputed(({ team, boards }) => ({
    members: computed(() => team()?.members ?? []),
    boardCount: computed(() => boards().length),
    isEmpty: computed(() => team() !== null && boards().length === 0),
  })),
  withMethods((store) => ({
    setTeam(team: TeamDto): void {
      patchState(store, { team });
    },
    setBoards(boards: ReadonlyArray<BoardDto>): void {
      patchState(store, { boards });
    },
    addBoard(board: BoardDto): void {
      patchState(store, { boards: [...store.boards(), board] });
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
