import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

/** Two-letter uppercase initials, e.g. "Ana Souza" → "AS". Kept local so the
 * design system stays self-contained (no app/shared-utils coupling). */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Deterministic HSL colour from a string, so the same name is always the
 * same hue without storing a colour. */
function stringToHslColor(value: string, saturation = 60, lightness = 45): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, ${saturation}%, ${lightness}%)`;
}

/**
 * tkf-avatar — a circular user/entity avatar. Shows the image when `src` is
 * provided, otherwise deterministic initials on a name-derived background so
 * the same name always renders the same colour. Replaces the initials+colour
 * markup that was duplicated across board, teams and clients views.
 *
 * Usage: `<tkf-avatar name="Ana Souza" size="sm" [src]="user.avatarUrl" />`
 */
@Component({
  selector: 'tkf-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-size]': 'size()',
    '[style.background]': 'src() ? null : background()',
    '[attr.title]': 'name()',
    role: 'img',
    '[attr.aria-label]': 'name()',
  },
  template: `
    @if (src(); as url) {
      <img class="tkf-avatar__img" [src]="url" alt="" />
    } @else {
      <span class="tkf-avatar__initials" aria-hidden="true">{{ text() }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-full);
        color: var(--color-neutral-0);
        font-family: var(--font-family-sans);
        font-weight: var(--font-weight-semibold);
        overflow: hidden;
        flex-shrink: 0;
        border: 2px solid var(--color-background-default);
        width: 32px;
        height: 32px;
        font-size: 12px;
      }
      :host[data-size='sm'] {
        width: 24px;
        height: 24px;
        font-size: 10px;
      }
      :host[data-size='lg'] {
        width: 44px;
        height: 44px;
        font-size: 16px;
      }
      .tkf-avatar__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .tkf-avatar__initials {
        line-height: 1;
      }
    `,
  ],
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly src = input<string | null | undefined>(undefined);
  readonly size = input<AvatarSize>('md');

  protected readonly text = computed(() => initials(this.name()));
  protected readonly background = computed(() => stringToHslColor(this.name()));
}
