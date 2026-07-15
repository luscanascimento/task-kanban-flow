import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * tkf-skeleton — a shimmering placeholder box for perceived-performance
 * loading states. Size it via `width`/`height` (any CSS length) and use
 * `radius="full"` for avatar placeholders. Honours prefers-reduced-motion.
 *
 * Usage: `<tkf-skeleton width="60%" height="1rem" />`
 */
@Component({
  selector: 'tkf-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[attr.data-radius]': 'radius()',
    'aria-hidden': 'true',
  },
  template: '',
  styles: [
    `
      :host {
        display: block;
        border-radius: var(--radius-md);
        background: linear-gradient(
          90deg,
          var(--color-neutral-100) 25%,
          var(--color-neutral-200) 37%,
          var(--color-neutral-100) 63%
        );
        background-size: 400% 100%;
        animation: tkf-skeleton-shimmer 1.4s ease infinite;
      }
      :host[data-radius='full'] {
        border-radius: var(--radius-full);
      }
      @keyframes tkf-skeleton-shimmer {
        0% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0 50%;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
        }
      }
    `,
  ],
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('1rem');
  readonly radius = input<'md' | 'full'>('md');
}
