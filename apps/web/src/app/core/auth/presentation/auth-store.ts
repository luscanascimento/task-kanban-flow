import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { UserDto } from '@tkf/shared-types';

interface AuthState {
  currentUser: UserDto | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  currentUser: null,
  isLoading: false,
  error: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ currentUser }) => ({
    isAuthenticated: () => currentUser() !== null,
  })),
  withMethods((store) => ({
    setUser(user: UserDto | null): void {
      patchState(store, { currentUser: user, error: null });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
    clearUser(): void {
      patchState(store, { currentUser: null, error: null, isLoading: false });
    },
  })),
);
