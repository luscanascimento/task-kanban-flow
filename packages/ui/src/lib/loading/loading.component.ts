import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * tkf-loading — accessible spinner with `aria-live="polite"` for screen readers.
 */
@Component({
  selector: 'tkf-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.aria-live]': '"polite"', role: 'status' },
  template: `
    <span class="tkf-loading__dot" aria-hidden="true"></span>
    <span class="tkf-loading__label">{{ label }}</span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
      }
      /* Keep the label in the accessibility tree but out of the visual layout,
         so aria-live announces it without changing the spinner's footprint. */
      .tkf-loading__label {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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
