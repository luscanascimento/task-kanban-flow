import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ShellComponent } from './shared/layout/shell/shell.component';

@Component({
  selector: 'tkf-root',
  standalone: true,
  imports: [RouterOutlet, ShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<tkf-shell><router-outlet /></tkf-shell>',
})
export class AppComponent {}
