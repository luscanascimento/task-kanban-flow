import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, LoadingComponent } from '@tkf/ui';
import type { ClientDto, SecretAuthType } from '@tkf/shared-types';

import { SecretsFacade } from '../../application/secrets.facade';

const AUTH_TYPES: ReadonlyArray<{ value: SecretAuthType; label: string }> = [
  { value: 'password', label: 'Password' },
  { value: 'api_key', label: 'API key' },
  { value: 'oauth', label: 'OAuth' },
  { value: 'access_token', label: 'Access token' },
  { value: 'ssh_key', label: 'SSH key' },
  { value: 'other', label: 'Other' },
];

/**
 * Secrets vault for a board — the client accounts/credentials used on this
 * project. Values are masked by default with reveal + copy affordances.
 * (Mock storage is plaintext; see `ProjectSecretDto` security note.)
 */
@Component({
  selector: 'tkf-secrets-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonComponent, LoadingComponent],
  template: `
    <div class="wrap">
      <div class="bar">
        <p class="bar__hint" i18n>
          🔒 Accounts &amp; credentials for this project. Stored for convenience — treat with care.
        </p>
        @if (!creating()) {
          <button type="button" tkf-button (click)="creating.set(true)" i18n>+ Add secret</button>
        }
      </div>

      @if (facade.error(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }

      @if (creating()) {
        <form class="composer" (submit)="submit($event)">
          <div class="row">
            <label class="field"
              ><span i18n>Platform</span>
              <input
                [(ngModel)]="platform"
                name="platform"
                placeholder="AWS, Google Ads…"
                i18n-placeholder
                autocomplete="off"
              />
            </label>
            <label class="field"
              ><span i18n>Account label</span>
              <input
                [(ngModel)]="label"
                name="label"
                placeholder="Production root"
                i18n-placeholder
                autocomplete="off"
              />
            </label>
          </div>
          <div class="row">
            <label class="field"
              ><span i18n>Auth type</span>
              <select [(ngModel)]="authType" name="authType">
                @for (a of authTypes; track a.value) {
                  <option [value]="a.value">{{ a.label }}</option>
                }
              </select>
            </label>
            <label class="field"
              ><span i18n>Client</span>
              <select [(ngModel)]="clientId" name="clientId">
                <option value="" i18n>— none —</option>
                @for (c of clients(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </label>
          </div>
          <div class="row">
            <label class="field"
              ><span i18n>Username / key id</span>
              <input [(ngModel)]="username" name="username" autocomplete="off" />
            </label>
            <label class="field"
              ><span i18n>Secret / credential</span>
              <input [(ngModel)]="secret" name="secret" autocomplete="off" />
            </label>
          </div>
          <label class="field"
            ><span i18n>URL</span>
            <input
              [(ngModel)]="url"
              name="url"
              placeholder="https://…"
              i18n-placeholder
              autocomplete="off"
            />
          </label>
          <div class="composer__actions">
            <button
              type="submit"
              tkf-button
              [disabled]="!platform().trim() || !label().trim() || !secret().trim()"
              i18n
            >
              Save secret
            </button>
            <button type="button" tkf-button variant="secondary" (click)="cancel()" i18n>
              Cancel
            </button>
          </div>
        </form>
      }

      @if (facade.isLoading()) {
        <div class="loading"><tkf-loading /> <span i18n>Loading secrets…</span></div>
      } @else if (facade.isEmpty()) {
        <p class="empty" i18n>No secrets stored for this project yet.</p>
      } @else {
        <ul class="list">
          @for (s of facade.secrets(); track s.id) {
            <li class="secret">
              <div class="secret__head">
                <span class="secret__platform">{{ s.platform }}</span>
                <span class="secret__type">{{ s.authType }}</span>
                <span class="secret__label">{{ s.label }}</span>
                <button
                  type="button"
                  class="icon"
                  aria-label="Delete secret"
                  i18n-aria-label
                  (click)="remove(s.id)"
                >
                  🗑
                </button>
              </div>
              @if (s.username) {
                <div class="secret__row">
                  <span class="secret__key" i18n>User</span>
                  <code class="secret__val">{{ s.username }}</code>
                  <button type="button" class="link" (click)="copy(s.username!)" i18n>copy</button>
                </div>
              }
              <div class="secret__row">
                <span class="secret__key" i18n>Secret</span>
                <code class="secret__val">{{ isRevealed(s.id) ? s.secret : mask(s.secret) }}</code>
                <button type="button" class="link" (click)="toggle(s.id)">
                  {{ isRevealed(s.id) ? revealOffLabel : revealOnLabel }}
                </button>
                <button type="button" class="link" (click)="copy(s.secret)" i18n>copy</button>
              </div>
              @if (s.url) {
                <a class="secret__url" [href]="s.url" target="_blank" rel="noopener noreferrer">{{
                  s.url
                }}</a>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .wrap {
        max-width: 760px;
      }
      .bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-3);
      }
      .bar__hint {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
      }
      .error {
        color: var(--color-semantic-danger);
      }
      .composer {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-3);
        background: var(--color-background-subtle);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-4);
        margin-bottom: var(--spacing-4);
      }
      .row {
        display: flex;
        gap: var(--spacing-3);
      }
      .field {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-muted);
      }
      .field input,
      .field select {
        padding: var(--spacing-2);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-regular);
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
        color: var(--color-foreground-subtle);
      }
      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-3);
      }
      .secret {
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-3);
        background: var(--color-background-default);
      }
      .secret__head {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }
      .secret__platform {
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-default);
      }
      .secret__type {
        font-size: 10px;
        text-transform: uppercase;
        color: var(--color-semantic-info);
        background: color-mix(in srgb, var(--color-semantic-info) 14%, transparent);
        border-radius: var(--radius-full);
        padding: 1px var(--spacing-2);
      }
      .secret__label {
        flex: 1;
        color: var(--color-foreground-muted);
        font-size: var(--font-size-sm);
      }
      .secret__row {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        margin-top: var(--spacing-2);
      }
      .secret__key {
        width: 56px;
        font-size: var(--font-size-xs);
        color: var(--color-foreground-subtle);
        text-transform: uppercase;
      }
      .secret__val {
        flex: 1;
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
        color: var(--color-foreground-default);
        background: var(--color-background-subtle);
        padding: 2px var(--spacing-2);
        border-radius: var(--radius-sm);
        overflow-x: auto;
        white-space: nowrap;
      }
      .link {
        border: none;
        background: transparent;
        color: var(--color-brand-600);
        cursor: pointer;
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
      }
      .icon {
        border: none;
        background: transparent;
        cursor: pointer;
        opacity: 0.6;
      }
      .icon:hover {
        opacity: 1;
      }
      .secret__url {
        display: inline-block;
        margin-top: var(--spacing-2);
        font-size: var(--font-size-xs);
        color: var(--color-foreground-muted);
      }
      @media (max-width: 640px) {
        .row {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class SecretsPanelComponent {
  readonly facade = inject(SecretsFacade);

  readonly boardId = input.required<string>();
  readonly clients = input<ReadonlyArray<ClientDto>>([]);

  readonly authTypes = AUTH_TYPES;
  readonly revealOnLabel = 'reveal';
  readonly revealOffLabel = 'hide';

  private readonly revealed = signal<ReadonlySet<string>>(new Set());

  readonly creating = signal(false);
  readonly platform = signal('');
  readonly label = signal('');
  readonly authType = signal<SecretAuthType>('api_key');
  readonly clientId = signal('');
  readonly username = signal('');
  readonly secret = signal('');
  readonly url = signal('');

  constructor() {
    effect(() => {
      void this.facade.load(this.boardId());
    });
  }

  isRevealed(id: string): boolean {
    return this.revealed().has(id);
  }

  toggle(id: string): void {
    const next = new Set(this.revealed());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.revealed.set(next);
  }

  mask(value: string): string {
    return '•'.repeat(Math.min(Math.max(value.length, 6), 24));
  }

  copy(value: string): void {
    void navigator.clipboard?.writeText(value);
  }

  submit(event: Event): void {
    event.preventDefault();
    const platform = this.platform().trim();
    const label = this.label().trim();
    const secret = this.secret().trim();
    if (!platform || !label || !secret) return;
    const username = this.username().trim();
    const url = this.url().trim();
    const clientId = this.clientId();
    void this.facade.create(this.boardId(), {
      boardId: this.boardId(),
      platform,
      label,
      authType: this.authType(),
      secret,
      ...(clientId ? { clientId } : {}),
      ...(username ? { username } : {}),
      ...(url ? { url } : {}),
    });
    this.cancel();
  }

  cancel(): void {
    this.creating.set(false);
    this.platform.set('');
    this.label.set('');
    this.authType.set('api_key');
    this.clientId.set('');
    this.username.set('');
    this.secret.set('');
    this.url.set('');
  }

  remove(id: string): void {
    void this.facade.remove(id);
  }
}
