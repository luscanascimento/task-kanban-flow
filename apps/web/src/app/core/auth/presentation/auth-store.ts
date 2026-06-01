import { Injectable, type Signal, computed, signal } from '@angular/core';

import type { UserDto } from '@tkf/shared-types';

/**
 * AuthStore — feature-scoped state for authentication.
 *
 * Implemented with plain signals for the scaffold; will migrate to
 * `signalStore` from @ngrx/signals in Phase 1 when use cases emerge.
 * Keeping the public surface small (currentUser, isAuthenticated) so
 * the migration is mechanical.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _currentUser = signal<UserDto | null>(null);
  readonly currentUser: Signal<UserDto | null> = this._currentUser.asReadonly();
  readonly isAuthenticated: Signal<boolean> = computed(() => this._currentUser() !== null);

  setUser(user: UserDto | null): void {
    this._currentUser.set(user);
  }
}
