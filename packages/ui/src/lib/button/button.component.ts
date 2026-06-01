import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * tkf-button — base button of the design system.
 * Variants compose on top of design tokens so themes propagate automatically.
 *
 * Usage: `<button tkf-button variant="primary" (click)="…">Save</button>`
 *
 * Storybook wiring will be added in Phase 1; the component itself ships now
 * so feature teams can consume it immediately.
 */
@Component({
  selector: '[tkf-button]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-variant]': 'variant',
    '[attr.data-disabled]': 'disabled || null',
  },
  template: '<ng-content />',
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-2);
        padding: var(--spacing-2) var(--spacing-4);
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        font-family: var(--font-family-sans);
        font-weight: var(--font-weight-medium);
        font-size: var(--font-size-sm);
        line-height: var(--font-line-height-tight);
        cursor: pointer;
        transition:
          background-color 120ms ease,
          color 120ms ease,
          border-color 120ms ease;
        background: var(--color-brand-500);
        color: var(--color-neutral-0);
      }
      :host[data-variant='secondary'] {
        background: var(--color-background-subtle);
        color: var(--color-foreground-default);
        border-color: var(--color-neutral-200);
      }
      :host[data-variant='ghost'] {
        background: transparent;
        color: var(--color-foreground-default);
      }
      :host[data-variant='danger'] {
        background: var(--color-semantic-danger);
        color: var(--color-neutral-0);
      }
      :host[data-disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }
      :host:hover:not([data-disabled]) {
        filter: brightness(0.95);
      }
    `,
  ],
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() disabled = false;
}
