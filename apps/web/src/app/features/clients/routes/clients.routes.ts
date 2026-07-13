import { type Routes } from '@angular/router';

import { authGuard } from '../../../core/auth/presentation/auth.guard';
import { ClientDetailFacade } from '../application/client-detail.facade';
import { ClientsFacade } from '../application/clients.facade';
import { ClientDetailStore } from '../presentation/client-detail-store';
import { ClientsStore } from '../presentation/clients-store';

/** Clients feature routes. Repository ports are bound app-wide. */
export const CLIENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    providers: [ClientsStore, ClientsFacade],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('../presentation/clients-list/clients-list.component').then(
            (m) => m.ClientsListComponent,
          ),
      },
      {
        path: ':clientId',
        providers: [ClientDetailStore, ClientDetailFacade],
        loadComponent: () =>
          import('../presentation/client-detail/client-detail.component').then(
            (m) => m.ClientDetailComponent,
          ),
      },
    ],
  },
];
