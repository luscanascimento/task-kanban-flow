import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * tkf-card — a surface container with token-driven border, radius and
 * elevation. Set `interactive` for hover elevation on clickable cards.
 * Replaces the ad-hoc `.card`/`.board`/`.client-card` surfaces in features.
 *
 * Usage: `<tkf-card interactive padding="md">…</tkf-card>`
 */
@Component({
  selector: 'tkf-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-padding]': 'padding()', '[attr.data-interactive]': 'interactive() || null' },
  template: '<ng-content />',
  styles: [
    `
      :host {
        display: block;
        background: var(--color-background-default);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
      }
      :host[data-padding='sm'] {
        padding: var(--spacing-2);
      }
      :host[data-padding='md'] {
        padding: var(--spacing-4);
      }
      :host[data-padding='lg'] {
        padding: var(--spacing-6);
      }
      :host[data-interactive] {
        cursor: pointer;
        transition:
          box-shadow 120ms ease,
          border-color 120ms ease,
          transform 120ms ease;
      }
      :host[data-interactive]:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--color-neutral-300);
      }
      :host[data-interactive]:focus-within {
        outline: 2px solid var(--color-brand-500);
        outline-offset: 2px;
      }
    `,
  ],
})
export class CardComponent {
  readonly padding = input<CardPadding>('md');
  readonly interactive = input(false);
}
