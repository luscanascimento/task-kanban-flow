import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { initials, stringToHslColor } from '@tkf/shared-utils';

export type AvatarSize = 'sm' | 'md' | 'lg';

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
