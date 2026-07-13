import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthFacade } from '../../../core/auth/application/auth.facade';
import { AuthStore } from '../../../core/auth/presentation/auth-store';
import { ThemeService } from '../../../core/theme/theme.service';

/**
 * Application shell — top-level layout hosting the header and a
 * `<ng-content />` for routed views. The header exposes global actions
 * (theme toggle, sign-out) and adapts to auth state: navigation and the
 * user chip appear only once a session exists.
 */
@Component({
  selector: 'tkf-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tkf-shell">
      <header class="tkf-shell__header">
        <a class="tkf-shell__brand" routerLink="/">
          <span class="tkf-shell__logo" aria-hidden="true">◧</span>
          Task Kanban Flow
        </a>

        @if (isAuthenticated()) {
          <nav class="tkf-shell__nav">
            <a
              routerLink="/teams"
              routerLinkActive="tkf-shell__link--active"
              class="tkf-shell__link"
              i18n
              >Teams</a
            >
            <a
              routerLink="/boards"
              routerLinkActive="tkf-shell__link--active"
              class="tkf-shell__link"
              i18n
              >Boards</a
            >
            <a
              routerLink="/clients"
              routerLinkActive="tkf-shell__link--active"
              class="tkf-shell__link"
              i18n
              >Clients</a
            >
          </nav>
        }

        <div class="tkf-shell__actions">
          <button
            type="button"
            class="tkf-shell__icon-btn"
            [attr.aria-label]="
              theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            "
            i18n-aria-label
            (click)="theme.toggle()"
          >
            {{ theme.theme() === 'dark' ? '☀' : '☾' }}
          </button>

          @if (currentUser(); as user) {
            <span class="tkf-shell__user" [title]="user.email">{{ user.displayName }}</span>
            <button type="button" class="tkf-shell__signout" (click)="logout()" i18n>
              Sign out
            </button>
          }
        </div>
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
        gap: var(--spacing-6);
        height: 56px;
        padding: 0 var(--spacing-4);
        background: var(--color-background-subtle);
        border-bottom: 1px solid var(--color-neutral-200);
      }
      .tkf-shell__brand {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2);
        font-weight: var(--font-weight-bold);
        color: var(--color-foreground-default);
        text-decoration: none;
      }
      .tkf-shell__logo {
        color: var(--color-brand-500);
        font-size: var(--font-size-lg);
      }
      .tkf-shell__nav {
        display: flex;
        gap: var(--spacing-2);
      }
      .tkf-shell__link {
        color: var(--color-foreground-muted);
        text-decoration: none;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        padding: var(--spacing-1) var(--spacing-2);
        border-radius: var(--radius-md);
      }
      .tkf-shell__link:hover {
        color: var(--color-foreground-default);
        background: var(--color-neutral-100);
      }
      .tkf-shell__link--active {
        color: var(--color-brand-600);
        background: var(--color-brand-50);
      }
      .tkf-shell__actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
      }
      .tkf-shell__icon-btn {
        border: 1px solid var(--color-neutral-200);
        background: var(--color-background-default);
        color: var(--color-foreground-default);
        width: 32px;
        height: 32px;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: var(--font-size-sm);
      }
      .tkf-shell__icon-btn:hover {
        border-color: var(--color-brand-500);
      }
      .tkf-shell__user {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-foreground-default);
      }
      .tkf-shell__signout {
        border: none;
        background: transparent;
        color: var(--color-foreground-muted);
        cursor: pointer;
        font-size: var(--font-size-sm);
      }
      .tkf-shell__signout:hover {
        color: var(--color-semantic-danger);
      }
      .tkf-shell__main {
        flex: 1;
        padding: var(--spacing-4);
      }
    `,
  ],
})
export class ShellComponent {
  private readonly auth = inject(AuthFacade);
  private readonly store = inject(AuthStore);
  readonly theme = inject(ThemeService);

  readonly currentUser = this.store.currentUser;
  readonly isAuthenticated = computed(() => this.store.isAuthenticated());

  logout(): void {
    void this.auth.logout();
  }
}
