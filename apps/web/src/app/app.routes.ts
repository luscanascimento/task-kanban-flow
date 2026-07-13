import { type Routes } from '@angular/router';

/**
 * Root routes for the user-facing app.
 * Each feature owns its own routes file and is lazy-loaded to keep
 * the initial bundle small. The shell layout lives at the app level
 * and child routes render inside <router-outlet /> within <tkf-shell>.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'teams',
  },
  {
    path: 'auth',
    loadChildren: () => import('./core/auth/routes/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'teams',
    loadChildren: () => import('./features/teams/routes/teams.routes').then((m) => m.TEAMS_ROUTES),
  },
  {
    path: 'boards',
    loadChildren: () =>
      import('./features/boards/routes/boards.routes').then((m) => m.BOARDS_ROUTES),
  },
  {
    path: 'clients',
    loadChildren: () =>
      import('./features/clients/routes/clients.routes').then((m) => m.CLIENTS_ROUTES),
  },
  {
    path: 'health',
    loadChildren: () =>
      import('./features/health-check/routes/health-check.routes').then(
        (m) => m.HEALTH_CHECK_ROUTES,
      ),
  },
  {
    path: '**',
    redirectTo: 'teams',
  },
];
