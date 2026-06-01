import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * tkf-loading — accessible spinner with `aria-live="polite"` for screen readers.
 */
@Component({
  selector: 'tkf-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.aria-live]': '"polite"' },
  template: `<span class="tkf-loading__dot" aria-hidden="true"></span>`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
      }
      .tkf-loading__dot {
        width: 1rem;
        height: 1rem;
        border: 2px solid var(--color-neutral-200);
        border-top-color: var(--color-brand-500);
        border-radius: var(--radius-full);
        animation: tkf-spin 0.7s linear infinite;
      }
      @keyframes tkf-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoadingComponent {
  @Input() label = 'Loading…';
}
