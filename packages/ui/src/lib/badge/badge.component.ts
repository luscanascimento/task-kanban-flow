import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

/**
 * tkf-badge — a small pill for statuses, priorities, labels and counts.
 * Colours are token-driven so themes propagate automatically. Replaces the
 * bespoke priority/label/count pills scattered across the board views.
 *
 * Usage: `<tkf-badge variant="danger" size="sm">High</tkf-badge>`
 */
@Component({
  selector: 'tkf-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-variant]': 'variant()', '[attr.data-size]': 'size()' },
  template: '<ng-content />',
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-1);
        padding: 1px var(--spacing-2);
        border-radius: var(--radius-full);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        line-height: var(--font-line-height-tight);
        white-space: nowrap;
        background: var(--color-neutral-100);
        color: var(--color-foreground-default);
      }
      :host[data-size='md'] {
        padding: var(--spacing-1) var(--spacing-3);
        font-size: var(--font-size-sm);
      }
      :host[data-variant='brand'] {
        background: color-mix(in srgb, var(--color-brand-500) 15%, transparent);
        color: var(--color-brand-600);
      }
      :host[data-variant='success'] {
        background: color-mix(in srgb, var(--color-semantic-success) 15%, transparent);
        color: var(--color-semantic-success);
      }
      :host[data-variant='warning'] {
        background: color-mix(in srgb, var(--color-semantic-warning) 18%, transparent);
        color: var(--color-semantic-warning);
      }
      :host[data-variant='danger'] {
        background: color-mix(in srgb, var(--color-semantic-danger) 15%, transparent);
        color: var(--color-semantic-danger);
      }
      :host[data-variant='info'] {
        background: color-mix(in srgb, var(--color-semantic-info) 15%, transparent);
        color: var(--color-semantic-info);
      }
    `,
  ],
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('neutral');
  readonly size = input<BadgeSize>('sm');
}
