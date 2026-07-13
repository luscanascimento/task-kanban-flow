import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonComponent, LoadingComponent } from '@tkf/ui';
import type { BoardVisibility, TeamRole } from '@tkf/shared-types';

import { TeamDetailFacade } from '../../application/team-detail.facade';
import { initials } from '../../../../shared/util/initials';

const ROLES: ReadonlyArray<TeamRole> = ['owner', 'admin', 'member'];

/**
 * Team detail — manage the team's members (who can see its boards) and the
 * boards themselves. Boards are created here, inside the team.
 */
@Component({
  selector: 'tkf-team-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, ButtonComponent, LoadingComponent],
  template: `
    <a routerLink="/teams" class="back" i18n>← Teams</a>

    @if (facade.isLoading()) {
      <div class="loading"><tkf-loading /> <span i18n>Loading team…</span></div>
    } @else if (facade.team(); as team) {
      <header class="head">
        <div>
          <h1 class="head__title">{{ team.name }}</h1>
          @if (team.description) {
            <p class="head__sub">{{ team.description }}</p>
          }
        </div>
      </header>

      @if (facade.error(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }

      <div class="cols">
        <!-- Members -->
        <section class="panel">
          <h2 class="panel__title" i18n>Members</h2>
          <ul class="members">
            @for (m of facade.members(); track m.user.id) {
              <li class="member">
                <span class="avatar" [title]="m.user.email">{{
                  toInitials(m.user.displayName)
                }}</span>
                <span class="member__name">
                  {{ m.user.displayName }}
                  <span class="member__email">{{ m.user.email }}</span>
                </span>
                @if (m.role === 'owner') {
                  <span class="badge" i18n>owner</span>
                } @else {
                  <select
                    class="role"
                    [ngModel]="m.role"
                    (ngModelChange)="changeRole(team.id, m.user.id, $event)"
                    [attr.aria-label]="'Role for ' + m.user.displayName"
                  >
                    @for (r of roles; track r) {
                      <option [value]="r">{{ r }}</option>
                    }
                  </select>
                  <button
                    type="button"
                    class="icon"
                    aria-label="Remove member"
                    i18n-aria-label
                    (click)="removeMember(team.id, m.user.id)"
                  >
                    ×
                  </button>
                }
              </li>
            }
          </ul>

          <form class="add-member" (submit)="addMember($event, team.id)">
            <input
              [(ngModel)]="memberEmail"
              name="email"
              type="email"
              placeholder="Invite by email…"
              i18n-placeholder
              autocomplete="off"
            />
            <select [(ngModel)]="memberRole" name="role" aria-label="Role" i18n-aria-label>
              <option value="member" i18n>member</option>
              <option value="admin" i18n>admin</option>
            </select>
            <button type="submit" tkf-button [disabled]="!memberEmail().trim()" i18n>Invite</button>
          </form>
          <p class="hint" i18n>Try ana&#64;example.com or bruno&#64;example.com.</p>
        </section>

        <!-- Boards -->
        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title" i18n>Boards</h2>
            @if (!creatingBoard()) {
              <button type="button" tkf-button (click)="creatingBoard.set(true)" i18n>
                + New board
              </button>
            }
          </div>

          @if (creatingBoard()) {
            <form class="composer" (submit)="createBoard($event, team.id)">
              <input
                [(ngModel)]="boardTitle"
                name="title"
                placeholder="Board title"
                i18n-placeholder
                autocomplete="off"
              />
              <input
                [(ngModel)]="boardDescription"
                name="desc"
                placeholder="Description (optional)"
                i18n-placeholder
                autocomplete="off"
              />
              <select
                [(ngModel)]="boardVisibility"
                name="visibility"
                aria-label="Visibility"
                i18n-aria-label
              >
                <option value="workspace" i18n>Workspace</option>
                <option value="private" i18n>Private</option>
                <option value="public" i18n>Public</option>
              </select>
              <div class="composer__actions">
                <button type="submit" tkf-button [disabled]="!boardTitle().trim()" i18n>
                  Create board
                </button>
                <button type="button" tkf-button variant="secondary" (click)="cancelBoard()" i18n>
                  Cancel
                </button>
              </div>
            </form>
          }

          @if (facade.isEmpty()) {
            <p class="hint" i18n>No boards in this team yet.</p>
          } @else {
            <ul class="boards">
              @for (board of facade.boards$(); track board.id) {
                <li class="board">
                  <a class="board__link" [routerLink]="['/boards', board.id]">
                    <span class="board__title">{{ board.title }}</span>
                    <span class="board__badge" [attr.data-v]="board.visibility">{{
                      board.visibility
                    }}</span>
                  </a>
                  <button
                    type="button"
                    class="icon"
                    aria-label="Delete board"
                    i18n-aria-label
                    (click)="deleteBoard(board.id)"
                  >
                    ×
                  </button>
                </li>
              }
            </ul>
          }
        </section>
      </div>
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
      .head__title {
        margin: var(--spacing-2) 0 0;
        font-size: var(--font-size-2xl);
        color: var(--color-foreground-default);
      }
      .head__sub {
        margin: var(--spacing-1) 0 var(--spacing-4);
        color: var(--color-foreground-muted);
        font-size: var(--font-size-sm);
      }
      .error {
        color: var(--color-semantic-danger);
      }
      .cols {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: var(--spacing-4);
        align-items: start;
      }
      .panel {
        background: var(--color-background-default);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-4);
      }
      .panel__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .panel__title {
        margin: 0 0 var(--spacing-3);
        font-size: var(--font-size-lg);
        color: var(--color-foreground-default);
      }
      .members {
        list-style: none;
        margin: 0 0 var(--spacing-4);
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }
      .member {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }
      .member__name {
        flex: 1;
        font-size: var(--font-size-sm);
        color: var(--color-foreground-default);
        display: flex;
        flex-direction: column;
      }
      .member__email {
        font-size: var(--font-size-xs);
        color: var(--color-foreground-subtle);
      }
      .avatar {
        width: 30px;
        height: 30px;
        border-radius: var(--radius-full);
        background: var(--color-brand-600);
        color: var(--color-neutral-0);
        font-size: 11px;
        font-weight: var(--font-weight-semibold);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .badge {
        font-size: var(--font-size-xs);
        color: var(--color-foreground-muted);
        background: var(--color-neutral-100);
        border-radius: var(--radius-full);
        padding: 2px var(--spacing-2);
      }
      .role,
      .add-member input,
      .add-member select,
      .composer input,
      .composer select {
        padding: var(--spacing-1) var(--spacing-2);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: var(--font-size-sm);
        background: var(--color-background-default);
        color: var(--color-foreground-default);
      }
      .icon {
        border: none;
        background: transparent;
        color: var(--color-foreground-subtle);
        cursor: pointer;
        font-size: var(--font-size-lg);
        line-height: 1;
      }
      .icon:hover {
        color: var(--color-semantic-danger);
      }
      .add-member {
        display: flex;
        gap: var(--spacing-2);
      }
      .add-member input {
        flex: 1;
      }
      .hint {
        font-size: var(--font-size-xs);
        color: var(--color-foreground-subtle);
        margin: var(--spacing-2) 0 0;
      }
      .composer {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
        margin-bottom: var(--spacing-3);
      }
      .composer__actions {
        display: flex;
        gap: var(--spacing-2);
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
        align-items: center;
        gap: var(--spacing-2);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-md);
        padding: var(--spacing-2) var(--spacing-3);
      }
      .board:hover {
        border-color: var(--color-brand-500);
      }
      .board__link {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-decoration: none;
        color: var(--color-foreground-default);
        font-weight: var(--font-weight-medium);
        font-size: var(--font-size-sm);
      }
      .board__badge {
        font-size: 10px;
        text-transform: uppercase;
        color: var(--color-foreground-muted);
        background: var(--color-neutral-100);
        border-radius: var(--radius-full);
        padding: 1px var(--spacing-2);
      }
      @media (max-width: 820px) {
        .cols {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TeamDetailComponent {
  readonly facade = inject(TeamDetailFacade);
  readonly teamId = input.required<string>();

  readonly roles = ROLES;

  readonly memberEmail = signal('');
  readonly memberRole = signal<TeamRole>('member');

  readonly creatingBoard = signal(false);
  readonly boardTitle = signal('');
  readonly boardDescription = signal('');
  readonly boardVisibility = signal<BoardVisibility>('workspace');

  constructor() {
    effect(() => {
      void this.facade.load(this.teamId());
    });
  }

  toInitials(name: string): string {
    return initials(name);
  }

  addMember(event: Event, teamId: string): void {
    event.preventDefault();
    const email = this.memberEmail().trim();
    if (!email) return;
    void this.facade.addMember(teamId, { email, role: this.memberRole() });
    this.memberEmail.set('');
  }

  changeRole(teamId: string, userId: string, role: TeamRole): void {
    void this.facade.changeMemberRole(teamId, userId, role);
  }

  removeMember(teamId: string, userId: string): void {
    void this.facade.removeMember(teamId, userId);
  }

  createBoard(event: Event, teamId: string): void {
    event.preventDefault();
    const title = this.boardTitle().trim();
    if (!title) return;
    const description = this.boardDescription().trim();
    void this.facade.createBoard({
      teamId,
      title,
      visibility: this.boardVisibility(),
      ...(description ? { description } : {}),
    });
    this.cancelBoard();
  }

  cancelBoard(): void {
    this.creatingBoard.set(false);
    this.boardTitle.set('');
    this.boardDescription.set('');
    this.boardVisibility.set('workspace');
  }

  deleteBoard(id: string): void {
    void this.facade.deleteBoard(id);
  }
}
