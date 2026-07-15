import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonComponent, LoadingComponent } from '@tkf/ui';

import { ClientsFacade } from '../../application/clients.facade';
import { initials } from '../../../../shared/util/initials';

/** Clients registry — global list of clients with an inline create composer. */
@Component({
  selector: 'tkf-clients-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, ButtonComponent, LoadingComponent],
  template: `
    <section>
      <header class="head">
        <div>
          <h1 class="head__title" i18n>Clients</h1>
          <p class="head__sub" i18n>Customers you can attach to boards and tasks.</p>
        </div>
        @if (!creating()) {
          <button type="button" tkf-button (click)="creating.set(true)" i18n>+ New client</button>
        }
      </header>

      @if (facade.error(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }

      @if (creating()) {
        <form class="composer" (submit)="submit($event)">
          <input
            [(ngModel)]="name"
            name="name"
            placeholder="Client name"
            i18n-placeholder
            autocomplete="off"
          />
          <input
            [(ngModel)]="company"
            name="company"
            placeholder="Company (optional)"
            i18n-placeholder
            autocomplete="off"
          />
          <input
            [(ngModel)]="email"
            name="email"
            type="email"
            placeholder="Email (optional)"
            i18n-placeholder
            autocomplete="off"
          />
          <label class="color">
            <span i18n>Color</span>
            <input [(ngModel)]="color" name="color" type="color" />
          </label>
          <div class="composer__actions">
            <button type="submit" tkf-button [disabled]="!name().trim()" i18n>Create</button>
            <button type="button" tkf-button variant="secondary" (click)="cancel()" i18n>
              Cancel
            </button>
          </div>
        </form>
      }

      @if (facade.isLoading()) {
        <div class="loading"><tkf-loading /> <span i18n>Loading clients…</span></div>
      } @else if (facade.isEmpty()) {
        <div class="empty">
          <p i18n>No clients yet.</p>
          <button type="button" tkf-button (click)="creating.set(true)" i18n>
            Add your first client
          </button>
        </div>
      } @else {
        <ul class="grid">
          @for (client of facade.clients(); track client.id) {
            <li class="card">
              <a class="card__link" [routerLink]="[client.id]">
                <span class="avatar" [style.background]="client.color || 'var(--color-brand-600)'">
                  {{ toInitials(client.name) }}
                </span>
                <span class="card__body">
                  <span class="card__name">{{ client.name }}</span>
                  @if (client.company) {
                    <span class="card__company">{{ client.company }}</span>
                  }
                  <span class="card__count"
                    >{{ client.boardCount }} <ng-container i18n>boards</ng-container></span
                  >
                </span>
              </a>
              <button
                type="button"
                class="del"
                aria-label="Delete client"
                i18n-aria-label
                (click)="remove(client.id)"
              >
                Delete
              </button>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      .head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-6);
      }
      .head__title {
        margin: 0;
        font-size: var(--font-size-2xl);
        color: var(--color-foreground-default);
      }
      .head__sub {
        margin: var(--spacing-1) 0 0;
        color: var(--color-foreground-muted);
        font-size: var(--font-size-sm);
      }
      .error {
        color: var(--color-semantic-danger);
      }
      .composer {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--spacing-2);
        background: var(--color-background-subtle);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-4);
        margin-bottom: var(--spacing-6);
      }
      .composer input:not([type='color']) {
        flex: 1;
        min-width: 160px;
        padding: var(--spacing-2);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: var(--font-size-sm);
        background: var(--color-background-default);
        color: var(--color-foreground-default);
      }
      .color {
        display: flex;
        align-items: center;
        gap: var(--spacing-1);
        font-size: var(--font-size-xs);
        color: var(--color-foreground-muted);
      }
      .composer__actions {
        display: flex;
        gap: var(--spacing-2);
      }
      .loading {
        display: flex;
        gap: var(--spacing-2);
        align-items: center;
        color: var(--color-foreground-muted);
      }
      .empty {
        text-align: center;
        padding: var(--spacing-16) 0;
        color: var(--color-foreground-muted);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
        align-items: center;
      }
      .grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: var(--spacing-4);
      }
      .card {
        position: relative;
        background: var(--color-background-default);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
      }
      .card:hover {
        border-color: var(--color-brand-500);
        box-shadow: var(--shadow-md);
      }
      .card__link {
        display: flex;
        gap: var(--spacing-3);
        align-items: center;
        padding: var(--spacing-4);
        text-decoration: none;
        color: inherit;
      }
      .avatar {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        color: var(--color-neutral-0);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .card__body {
        display: flex;
        flex-direction: column;
      }
      .card__name {
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-default);
      }
      .card__company {
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
      }
      .card__count {
        font-size: var(--font-size-xs);
        color: var(--color-foreground-subtle);
      }
      .del {
        position: absolute;
        top: var(--spacing-2);
        right: var(--spacing-2);
        border: none;
        background: transparent;
        color: var(--color-foreground-subtle);
        font-size: var(--font-size-xs);
        cursor: pointer;
        opacity: 0;
      }
      .card:hover .del,
      .card:focus-within .del,
      .del:focus-visible {
        opacity: 1;
      }
      .del:hover {
        color: var(--color-semantic-danger);
      }
    `,
  ],
})
export class ClientsListComponent {
  readonly facade = inject(ClientsFacade);

  readonly creating = signal(false);
  readonly name = signal('');
  readonly company = signal('');
  readonly email = signal('');
  readonly color = signal('#0ea5e9');

  constructor() {
    void this.facade.load();
  }

  toInitials(name: string): string {
    return initials(name);
  }

  submit(event: Event): void {
    event.preventDefault();
    const name = this.name().trim();
    if (!name) return;
    const company = this.company().trim();
    const email = this.email().trim();
    void this.facade.create({
      name,
      color: this.color(),
      ...(company ? { company } : {}),
      ...(email ? { email } : {}),
    });
    this.cancel();
  }

  cancel(): void {
    this.creating.set(false);
    this.name.set('');
    this.company.set('');
    this.email.set('');
    this.color.set('#0ea5e9');
  }

  remove(id: string): void {
    void this.facade.remove(id);
  }
}
