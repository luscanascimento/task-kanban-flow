import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LoadingComponent } from '@tkf/ui';
import type { BoardVisibility } from '@tkf/shared-types';

import { BoardsFacade } from '../../application/boards.facade';
import { initials } from '../../../../shared/util/initials';

const VISIBILITY_LABELS: Record<BoardVisibility, string> = {
  private: 'Private',
  workspace: 'Workspace',
  public: 'Public',
};

/**
 * All boards you can access across your teams. Boards are created inside a
 * team (see the Teams area); this is a flat cross-team overview.
 */
@Component({
  selector: 'tkf-boards-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingComponent],
  template: `
    <section class="boards">
      <header class="boards__header">
        <div>
          <h1 class="boards__title" i18n>Boards</h1>
          <p class="boards__subtitle" i18n>Every board across your teams.</p>
        </div>
        <a routerLink="/teams" class="boards__link" i18n>Manage teams →</a>
      </header>

      @if (facade.error(); as error) {
        <p class="boards__error" role="alert">{{ error }}</p>
      }

      @if (facade.isLoading()) {
        <div class="boards__loading"><tkf-loading /> <span i18n>Loading boards…</span></div>
      } @else if (facade.isEmpty()) {
        <div class="boards__empty">
          <p i18n>No boards yet.</p>
          <a routerLink="/teams" class="boards__link" i18n>Create one inside a team →</a>
        </div>
      } @else {
        <ul class="boards__grid">
          @for (board of facade.boards(); track board.id) {
            <li class="board-card">
              <a class="board-card__link" [routerLink]="[board.id]">
                <div class="board-card__top">
                  <h3 class="board-card__title">{{ board.title }}</h3>
                  <span class="board-card__badge" [attr.data-visibility]="board.visibility">
                    {{ visibilityLabel(board.visibility) }}
                  </span>
                </div>
                @if (board.description) {
                  <p class="board-card__desc">{{ board.description }}</p>
                }
                <div class="board-card__members">
                  @for (member of board.members; track member.user.id) {
                    <span class="board-card__avatar" [title]="member.user.displayName">
                      {{ toInitials(member.user.displayName) }}
                    </span>
                  }
                </div>
              </a>
              <button
                type="button"
                class="board-card__delete"
                aria-label="Delete board"
                i18n-aria-label
                (click)="remove(board.id)"
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
      :host {
        display: block;
      }
      .boards__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-6);
      }
      .boards__title {
        margin: 0;
        font-size: var(--font-size-2xl);
        color: var(--color-foreground-default);
      }
      .boards__subtitle {
        margin: var(--spacing-1) 0 0;
        color: var(--color-foreground-muted);
        font-size: var(--font-size-sm);
      }
      .boards__link {
        color: var(--color-brand-600);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        text-decoration: none;
      }
      .boards__error {
        color: var(--color-semantic-danger);
      }
      .boards__loading {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        color: var(--color-foreground-muted);
      }
      .boards__empty {
        text-align: center;
        padding: var(--spacing-16) var(--spacing-4);
        color: var(--color-foreground-muted);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-4);
      }
      .boards__grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: var(--spacing-4);
      }
      .board-card {
        position: relative;
        background: var(--color-background-default);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
      }
      .board-card:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--color-brand-500);
      }
      .board-card__link {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
        padding: var(--spacing-4);
        text-decoration: none;
        color: inherit;
      }
      .board-card__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--spacing-2);
      }
      .board-card__title {
        margin: 0;
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-default);
      }
      .board-card__badge {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: var(--font-weight-semibold);
        padding: 2px var(--spacing-2);
        border-radius: var(--radius-full);
        background: var(--color-neutral-100);
        color: var(--color-foreground-muted);
        white-space: nowrap;
      }
      .board-card__badge[data-visibility='public'] {
        background: color-mix(in srgb, var(--color-semantic-success) 16%, transparent);
        color: var(--color-semantic-success);
      }
      .board-card__badge[data-visibility='workspace'] {
        background: color-mix(in srgb, var(--color-semantic-info) 16%, transparent);
        color: var(--color-semantic-info);
      }
      .board-card__desc {
        margin: 0;
        color: var(--color-foreground-muted);
        font-size: var(--font-size-sm);
        line-height: var(--font-lineHeight-normal);
      }
      .board-card__members {
        display: flex;
        margin-top: var(--spacing-1);
      }
      .board-card__avatar {
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
      .board-card__avatar:first-child {
        margin-left: 0;
      }
      .board-card__delete {
        position: absolute;
        top: var(--spacing-2);
        right: var(--spacing-2);
        border: none;
        background: transparent;
        color: var(--color-foreground-subtle);
        font-size: var(--font-size-xs);
        cursor: pointer;
        opacity: 0;
        border-radius: var(--radius-sm);
        padding: 2px var(--spacing-1);
      }
      .board-card:hover .board-card__delete {
        opacity: 1;
      }
      .board-card__delete:hover {
        color: var(--color-semantic-danger);
      }
    `,
  ],
})
export class BoardsListComponent {
  readonly facade = inject(BoardsFacade);

  constructor() {
    void this.facade.load();
  }

  visibilityLabel(v: BoardVisibility): string {
    return VISIBILITY_LABELS[v];
  }

  toInitials(name: string): string {
    return initials(name);
  }

  remove(id: string): void {
    void this.facade.remove(id);
  }
}
