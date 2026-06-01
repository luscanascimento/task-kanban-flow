import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Application shell — top-level layout that hosts the header and a
 * `<ng-content />` for routed views. Intentionally minimal for the
 * scaffolding phase; sidebar/breadcrumbs will be added in Phase 1.
 */
@Component({
  selector: 'tkf-shell',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tkf-shell">
      <header class="tkf-shell__header">
        <a class="tkf-shell__brand" routerLink="/">Task Kanban Flow</a>
      </header>
      <main class="tkf-shell__main">
        <ng-content />
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
      .tkf-shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .tkf-shell__header {
        display: flex;
        align-items: center;
        height: 56px;
        padding: 0 1rem;
        background: var(--color-background-subtle);
        border-bottom: 1px solid var(--color-neutral-200);
      }
      .tkf-shell__brand {
        font-weight: var(--font-weight-bold);
        color: var(--color-foreground-default);
      }
      .tkf-shell__main {
        flex: 1;
        padding: 1rem;
      }
    `,
  ],
})
export class ShellComponent {}
