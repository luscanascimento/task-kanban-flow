import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, LoadingComponent } from '@tkf/ui';

import type { ApiKeyScope, CreatedApiKeyDto } from '@tkf/shared-types';

import { ApiKeysFacade } from '../../application/api-keys.facade';

/**
 * API Keys settings screen. Create a key (its plaintext value is shown once),
 * copy it, and revoke keys. A revoked key stops working immediately.
 */
@Component({
  selector: 'tkf-api-keys',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe, ButtonComponent, LoadingComponent],
  template: `
    <section>
      <header class="head">
        <div>
          <h1 class="head__title" i18n>API Keys</h1>
          <p class="head__sub" i18n>
            Authenticate external clients and the MCP server against the public API.
          </p>
        </div>
        @if (!creating()) {
          <button type="button" tkf-button (click)="creating.set(true)" i18n>+ New key</button>
        }
      </header>

      @if (facade.error(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }

      <!-- The freshly created key — shown exactly once. -->
      @if (newKey(); as created) {
        <div class="reveal" role="status">
          <p class="reveal__title" i18n>Copy your new key now — it won't be shown again.</p>
          <div class="reveal__row">
            <code class="reveal__key">{{ created.key }}</code>
            <button type="button" tkf-button variant="secondary" (click)="copy(created.key)">
              {{ copied() ? copiedLabel : copyLabel }}
            </button>
          </div>
          <button type="button" class="reveal__dismiss" (click)="dismissReveal()" i18n>Done</button>
        </div>
      }

      @if (creating()) {
        <form class="composer" (submit)="submit($event)">
          <input
            [(ngModel)]="name"
            name="name"
            placeholder="Key name (e.g. CI, MCP agent)"
            i18n-placeholder
            autocomplete="off"
            aria-label="Key name"
            i18n-aria-label
          />
          <label class="scope">
            <span i18n>Scope</span>
            <select [(ngModel)]="scope" name="scope" aria-label="Key scope" i18n-aria-label>
              <option value="read" i18n>read (query only)</option>
              <option value="read_write" i18n>read_write (query + mutate)</option>
            </select>
          </label>
          <div class="composer__actions">
            <button type="submit" tkf-button [disabled]="!name().trim() || submitting()" i18n>
              Create key
            </button>
            <button type="button" tkf-button variant="secondary" (click)="cancel()" i18n>
              Cancel
            </button>
          </div>
        </form>
      }

      @if (facade.isLoading()) {
        <div class="loading"><tkf-loading /> <span i18n>Loading keys…</span></div>
      } @else if (facade.isEmpty()) {
        <div class="empty">
          <p i18n>No API keys yet.</p>
          <button type="button" tkf-button (click)="creating.set(true)" i18n>
            Create your first key
          </button>
        </div>
      } @else {
        <ul class="list">
          @for (key of facade.keys(); track key.id) {
            <li class="row" [class.row--revoked]="key.revoked">
              <div class="row__main">
                <code class="row__prefix">{{ key.display }}…</code>
                <span class="row__name">{{ key.name }}</span>
                <span class="badge" [class.badge--write]="key.scope === 'read_write'">{{
                  key.scope
                }}</span>
                @if (key.revoked) {
                  <span class="badge badge--revoked" i18n>revoked</span>
                }
              </div>
              <div class="row__meta">
                <span i18n>created {{ key.createdAt | date: 'mediumDate' }}</span>
                @if (key.lastUsedAt) {
                  <span i18n>· last used {{ key.lastUsedAt | date: 'short' }}</span>
                }
              </div>
              @if (!key.revoked) {
                <button
                  type="button"
                  class="revoke"
                  (click)="revoke(key.id)"
                  aria-label="Revoke key"
                  i18n-aria-label
                  i18n
                >
                  Revoke
                </button>
              }
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
      .reveal {
        background: var(--color-background-subtle);
        border: 1px solid var(--color-brand-500);
        border-radius: var(--radius-lg);
        padding: var(--spacing-4);
        margin-bottom: var(--spacing-6);
      }
      .reveal__title {
        margin: 0 0 var(--spacing-2);
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-default);
      }
      .reveal__row {
        display: flex;
        gap: var(--spacing-2);
        align-items: center;
        flex-wrap: wrap;
      }
      .reveal__key {
        flex: 1;
        min-width: 240px;
        padding: var(--spacing-2) var(--spacing-3);
        background: var(--color-background-default);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font-family: var(--font-family-mono, monospace);
        font-size: var(--font-size-sm);
        word-break: break-all;
        color: var(--color-foreground-default);
      }
      .reveal__dismiss {
        margin-top: var(--spacing-2);
        border: none;
        background: transparent;
        color: var(--color-foreground-muted);
        cursor: pointer;
        font-size: var(--font-size-sm);
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
      .composer input {
        flex: 1;
        min-width: 200px;
        padding: var(--spacing-2);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: var(--font-size-sm);
        background: var(--color-background-default);
        color: var(--color-foreground-default);
      }
      .scope {
        display: flex;
        align-items: center;
        gap: var(--spacing-1);
        font-size: var(--font-size-xs);
        color: var(--color-foreground-muted);
      }
      .scope select {
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
      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }
      .row {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
        position: relative;
        background: var(--color-background-default);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-4);
      }
      .row--revoked {
        opacity: 0.6;
      }
      .row__main {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        flex-wrap: wrap;
      }
      .row__prefix {
        font-family: var(--font-family-mono, monospace);
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
      }
      .row__name {
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-default);
      }
      .badge {
        font-size: var(--font-size-xs);
        padding: 2px var(--spacing-2);
        border-radius: var(--radius-full);
        background: var(--color-neutral-200);
        color: var(--color-foreground-muted);
      }
      .badge--write {
        background: var(--color-brand-100, var(--color-neutral-200));
        color: var(--color-brand-700, var(--color-foreground-default));
      }
      .badge--revoked {
        background: var(--color-semantic-danger);
        color: var(--color-neutral-0);
      }
      .row__meta {
        font-size: var(--font-size-xs);
        color: var(--color-foreground-subtle);
        display: flex;
        gap: var(--spacing-1);
        flex-wrap: wrap;
      }
      .revoke {
        position: absolute;
        top: var(--spacing-3);
        right: var(--spacing-3);
        border: none;
        background: transparent;
        color: var(--color-foreground-subtle);
        font-size: var(--font-size-xs);
        cursor: pointer;
      }
      .revoke:hover {
        color: var(--color-semantic-danger);
      }
    `,
  ],
})
export class ApiKeysComponent {
  readonly facade = inject(ApiKeysFacade);

  readonly creating = signal(false);
  readonly submitting = signal(false);
  readonly name = signal('');
  readonly scope = signal<ApiKeyScope>('read');
  readonly newKey = signal<CreatedApiKeyDto | null>(null);
  readonly copied = signal(false);

  readonly copyLabel = 'Copy';
  readonly copiedLabel = 'Copied!';

  constructor() {
    void this.facade.load();
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.name().trim();
    if (!name || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    try {
      const created = await this.facade.create({ name, scope: this.scope() });
      this.newKey.set(created);
      this.copied.set(false);
      this.cancel();
    } finally {
      this.submitting.set(false);
    }
  }

  cancel(): void {
    this.creating.set(false);
    this.name.set('');
    this.scope.set('read');
  }

  dismissReveal(): void {
    this.newKey.set(null);
    this.copied.set(false);
  }

  async copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }

  revoke(id: string): void {
    void this.facade.revoke(id);
  }
}
