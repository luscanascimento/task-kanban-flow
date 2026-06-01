import { inject } from '@angular/core';
import { type CanActivateFn } from '@angular/router';

import { AuthStore } from './auth-store';

/** Functional route guard — rejects navigation when no user is authenticated. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.isAuthenticated();
};
