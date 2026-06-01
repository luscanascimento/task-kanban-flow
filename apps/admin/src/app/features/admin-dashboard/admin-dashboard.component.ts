import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tkf-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Admin dashboard placeholder — populated in Phase 1.</p>`,
})
export class AdminDashboardComponent {}
