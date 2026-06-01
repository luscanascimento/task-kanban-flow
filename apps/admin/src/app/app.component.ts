import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'tkf-admin-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header><h1>TKF Admin</h1></header>
    <main><router-outlet /></main>
  `,
})
export class AppComponent {}
