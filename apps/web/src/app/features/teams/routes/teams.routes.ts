import { type Routes } from '@angular/router';

import { authGuard } from '../../../core/auth/presentation/auth.guard';
import { TeamDetailFacade } from '../application/team-detail.facade';
import { TeamsFacade } from '../application/teams.facade';
import { TeamDetailStore } from '../presentation/team-detail-store';
import { TeamsStore } from '../presentation/teams-store';

/**
 * Teams feature routes. Repository ports are bound app-wide; here we scope the
 * list store/facade to the feature and give the detail route its own store +
 * facade for a fresh team view per navigation.
 */
export const TEAMS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    providers: [TeamsStore, TeamsFacade],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('../presentation/teams-list/teams-list.component').then(
            (m) => m.TeamsListComponent,
          ),
      },
      {
        path: ':teamId',
        providers: [TeamDetailStore, TeamDetailFacade],
        loadComponent: () =>
          import('../presentation/team-detail/team-detail.component').then(
            (m) => m.TeamDetailComponent,
          ),
      },
    ],
  },
];
