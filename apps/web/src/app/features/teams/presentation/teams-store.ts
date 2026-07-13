import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { TeamDto } from '@tkf/shared-types';

interface TeamsState {
  teams: ReadonlyArray<TeamDto>;
  isLoading: boolean;
  error: string | null;
}

const initialState: TeamsState = { teams: [], isLoading: false, error: null };

/** Feature-scoped store for the teams list. */
export const TeamsStore = signalStore(
  withState(initialState),
  withComputed(({ teams }) => ({
    isEmpty: computed(() => teams().length === 0),
  })),
  withMethods((store) => ({
    setTeams(teams: ReadonlyArray<TeamDto>): void {
      patchState(store, { teams, isLoading: false, error: null });
    },
    upsert(team: TeamDto): void {
      const exists = store.teams().some((t) => t.id === team.id);
      const teams = exists
        ? store.teams().map((t) => (t.id === team.id ? team : t))
        : [...store.teams(), team];
      patchState(store, { teams });
    },
    remove(id: string): void {
      patchState(store, { teams: store.teams().filter((t) => t.id !== id) });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  })),
);
