import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LoadingComponent } from '@tkf/ui';

import { ClientDetailFacade } from '../../application/client-detail.facade';
import { initials } from '../../../../shared/util/initials';

/** Client detail — contact info plus the boards assigned to this client. */
@Component({
  selector: 'tkf-client-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingComponent],
  template: `
    <a routerLink="/clients" class="back" i18n>← Clients</a>

    @if (facade.isLoading()) {
      <div class="loading"><tkf-loading /> <span i18n>Loading client…</span></div>
    } @else if (facade.error(); as error) {
      <p class="error" role="alert">{{ error }}</p>
    } @else if (facade.client(); as client) {
      <header class="head">
        <span class="avatar" [style.background]="client.color || 'var(--color-brand-600)'">{{
          toInitials(client.name)
        }}</span>
        <div>
          <h1 class="head__title">{{ client.name }}</h1>
          @if (client.company) {
            <p class="head__company">{{ client.company }}</p>
          }
        </div>
      </header>

      <dl class="info">
        @if (client.email) {
          <div>
            <dt i18n>Email</dt>
            <dd>{{ client.email }}</dd>
          </div>
        }
        @if (client.phone) {
          <div>
            <dt i18n>Phone</dt>
            <dd>{{ client.phone }}</dd>
          </div>
        }
        @if (client.notes) {
          <div class="info__full">
            <dt i18n>Notes</dt>
            <dd>{{ client.notes }}</dd>
          </div>
        }
      </dl>

      <h2 class="section" i18n>Boards</h2>
      @if (facade.hasBoards()) {
        <ul class="boards">
          @for (board of facade.boards(); track board.id) {
            <li>
              <a [routerLink]="['/boards', board.id]" class="board">
                <span>{{ board.title }}</span>
                <span class="board__badge">{{ board.visibility }}</span>
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="hint" i18n>No boards assigned to this client yet.</p>
      }
    }
  `,
  styles: [
    `
      .back {
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
      }
      .loading {
        display: flex;
        gap: var(--spacing-2);
        align-items: center;
        color: var(--color-foreground-muted);
        padding: var(--spacing-8);
      }
      .error {
        color: var(--color-semantic-danger);
      }
      .head {
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
        margin: var(--spacing-3) 0 var(--spacing-4);
      }
      .avatar {
        width: 52px;
        height: 52px;
        border-radius: var(--radius-full);
        color: var(--color-neutral-0);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .head__title {
        margin: 0;
        font-size: var(--font-size-2xl);
        color: var(--color-foreground-default);
      }
      .head__company {
        margin: 0;
        color: var(--color-foreground-muted);
      }
      .info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-3);
        margin: 0 0 var(--spacing-6);
        background: var(--color-background-subtle);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-4);
      }
      .info__full {
        grid-column: 1 / -1;
      }
      dt {
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--color-foreground-muted);
      }
      dd {
        margin: 2px 0 0;
        color: var(--color-foreground-default);
        font-size: var(--font-size-sm);
      }
      .section {
        font-size: var(--font-size-lg);
        color: var(--color-foreground-default);
      }
      .boards {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }
      .board {
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-decoration: none;
        color: var(--color-foreground-default);
        font-weight: var(--font-weight-medium);
        font-size: var(--font-size-sm);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-md);
        padding: var(--spacing-2) var(--spacing-3);
      }
      .board:hover {
        border-color: var(--color-brand-500);
      }
      .board__badge {
        font-size: 10px;
        text-transform: uppercase;
        color: var(--color-foreground-muted);
        background: var(--color-neutral-100);
        border-radius: var(--radius-full);
        padding: 1px var(--spacing-2);
      }
      .hint {
        color: var(--color-foreground-subtle);
        font-size: var(--font-size-sm);
      }
    `,
  ],
})
export class ClientDetailComponent {
  readonly facade = inject(ClientDetailFacade);
  readonly clientId = input.required<string>();

  constructor() {
    effect(() => {
      void this.facade.load(this.clientId());
    });
  }

  toInitials(name: string): string {
    return initials(name);
  }
}
