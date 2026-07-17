import { type Routes } from '@angular/router';

import { authGuard } from '../../../core/auth/presentation/auth.guard';
import { ApiKeysFacade } from '../application/api-keys.facade';
import { ApiKeysStore } from '../presentation/api-keys-store';

/** API-keys settings routes. The repository port is bound app-wide. */
export const API_KEYS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    providers: [ApiKeysStore, ApiKeysFacade],
    loadComponent: () =>
      import('../presentation/api-keys/api-keys.component').then((m) => m.ApiKeysComponent),
  },
];
