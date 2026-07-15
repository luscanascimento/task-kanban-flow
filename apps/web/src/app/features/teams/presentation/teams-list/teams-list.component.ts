import { ChangeDetectionStrategy, Component, inject, signal, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonComponent, LoadingComponent } from '@tkf/ui';

import { TeamsFacade } from '../../application/teams.facade';
import { initials } from '../../../../shared/util/initials';

/**
 * Teams landing page — a grid of team cards plus an inline "create team"
 * composer. Teams are the top of the hierarchy: you open a team to see and
 * create its boards.
 */
@Component({
  selector: 'tkf-teams-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, ButtonComponent, LoadingComponent],
  template: `
    <section>
      <header class="head">
        <div>
          <h1 class="head__title" i18n>Teams</h1>
          <p class="head__sub" i18n>Group work and control who sees which boards.</p>
        </div>
        @if (!creating()) {
          <button type="button" tkf-button (click)="creating.set(true)" i18n>+ New team</button>
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
            placeholder="Team name"
            i18n-placeholder
            autocomplete="off"
          />
          <input
            [(ngModel)]="description"
            name="description"
            placeholder="Description (optional)"
            i18n-placeholder
            autocomplete="off"
          />
          <div class="composer__actions">
            <button type="submit" tkf-button [disabled]="!name().trim()" i18n>Create</button>
            <button type="button" tkf-button variant="secondary" (click)="cancel()" i18n>
              Cancel
            </button>
          </div>
        </form>
      }

      @if (facade.isLoading()) {
        <div class="loading"><tkf-loading /> <span i18n>Loading teams…</span></div>
      } @else if (facade.isEmpty()) {
        <div class="empty">
          <p i18n>No teams yet.</p>
          <button type="button" tkf-button (click)="creating.set(true)" i18n>
            Create your first team
          </button>
        </div>
      } @else {
        <ul class="grid">
          @for (team of facade.teams(); track team.id) {
            <li class="card">
              <a class="card__link" [routerLink]="[team.id]">
                <h3 class="card__title">{{ team.name }}</h3>
                @if (team.description) {
                  <p class="card__desc">{{ team.description }}</p>
                }
                <div class="card__foot">
                  <div class="avatars">
                    @for (m of team.members; track m.user.id) {
                      <span class="avatar" [title]="m.user.displayName">{{
                        toInitials(m.user.displayName)
                      }}</span>
                    }
                  </div>
                  <span class="count"
                    >{{ team.boardCount }} <ng-container i18n>boards</ng-container></span
                  >
                </div>
              </a>
              <button
                type="button"
                class="del"
                aria-label="Delete team"
                i18n-aria-label
                (click)="remove(team.id)"
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
        gap: var(--spacing-2);
        background: var(--color-background-subtle);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-4);
        margin-bottom: var(--spacing-6);
      }
      .composer input {
        flex: 1;
        min-width: 180px;
        padding: var(--spacing-2);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: var(--font-size-sm);
        background: var(--color-background-default);
        color: var(--color-foreground-default);
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
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
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
        display: block;
        padding: var(--spacing-4);
        text-decoration: none;
        color: inherit;
      }
      .card__title {
        margin: 0 0 var(--spacing-1);
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-default);
      }
      .card__desc {
        margin: 0 0 var(--spacing-3);
        color: var(--color-foreground-muted);
        font-size: var(--font-size-sm);
      }
      .card__foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .avatars {
        display: flex;
      }
      .avatar {
        width: 26px;
        height: 26px;
        border-radius: var(--radius-full);
        background: var(--color-brand-600);
        color: var(--color-neutral-0);
        font-size: 10px;
        font-weight: var(--font-weight-semibold);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--color-background-default);
        margin-left: -8px;
      }
      .avatar:first-child {
        margin-left: 0;
      }
      .count {
        font-size: var(--font-size-xs);
        color: var(--color-foreground-muted);
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
export class TeamsListComponent implements OnInit {
  readonly facade = inject(TeamsFacade);

  readonly creating = signal(false);
  readonly name = signal('');
  readonly description = signal('');

  ngOnInit(): void {
    void this.facade.load();
  }

  toInitials(name: string): string {
    return initials(name);
  }

  submit(event: Event): void {
    event.preventDefault();
    const name = this.name().trim();
    if (!name) return;
    const description = this.description().trim();
    void this.facade.create({ name, ...(description ? { description } : {}) });
    this.cancel();
  }

  cancel(): void {
    this.creating.set(false);
    this.name.set('');
    this.description.set('');
  }

  remove(id: string): void {
    void this.facade.remove(id);
  }
}
