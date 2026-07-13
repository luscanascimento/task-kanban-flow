import { type Routes } from '@angular/router';

import { authGuard } from '../../../core/auth/presentation/auth.guard';
import { BoardDetailFacade } from '../application/board-detail.facade';
import { BoardsFacade } from '../application/boards.facade';
import { SecretsFacade } from '../application/secrets.facade';
import { BoardDetailStore } from '../presentation/board-detail-store';
import { BoardsStore } from '../presentation/boards-store';
import { SecretsStore } from '../presentation/secrets-store';

/**
 * Boards feature routes. Repository ports are bound app-wide by
 * `provideKanbanData()`; here we only scope the feature's Signal Stores and
 * facades. The list store/facade live for the whole feature; the detail
 * route provides its own board + secrets stores, scoping a fresh board view
 * per navigation.
 */
export const BOARDS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    providers: [BoardsStore, BoardsFacade],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('../presentation/boards-list/boards-list.component').then(
            (m) => m.BoardsListComponent,
          ),
      },
      {
        path: ':boardId',
        providers: [BoardDetailStore, BoardDetailFacade, SecretsStore, SecretsFacade],
        loadComponent: () =>
          import('../presentation/board-detail/board-detail.component').then(
            (m) => m.BoardDetailComponent,
          ),
      },
    ],
  },
];
