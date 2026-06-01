import { type Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
