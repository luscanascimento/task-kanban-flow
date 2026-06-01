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
    redirectTo: 'health',
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
    redirectTo: 'health',
  },
];
