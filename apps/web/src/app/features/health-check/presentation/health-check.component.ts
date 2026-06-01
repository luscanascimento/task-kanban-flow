import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';

import { HealthCheckService } from '../application/health-check.service';

@Component({
  selector: 'tkf-health-check',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h1>Task Kanban Flow</h1>
      <p i18n>Scaffolding phase — health check endpoint.</p>
      @if (status()) {
        <pre data-testid="health-status">{{ status() | json }}</pre>
      } @else {
        <p i18n>Checking API status…</p>
      }
    </section>
  `,
})
export class HealthCheckComponent implements OnInit {
  private readonly service = inject(HealthCheckService);
  readonly status = this.service.status;

  ngOnInit(): void {
    void this.service.check();
  }
}
