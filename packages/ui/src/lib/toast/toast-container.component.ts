import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from './toast.service';

/**
 * tkf-toast-container — renders the ToastService queue in an aria-live region.
 * Mount once at the app root (e.g. in the shell). Errors use role="alert"
 * (assertive); the rest are polite announcements.
 */
@Component({
  selector: 'tkf-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tkf-toasts" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="tkf-toast"
          [attr.data-variant]="toast.variant"
          [attr.role]="toast.variant === 'error' ? 'alert' : 'status'"
        >
          <span class="tkf-toast__icon" aria-hidden="true">{{ icon(toast.variant) }}</span>
          <div class="tkf-toast__content">
            @if (toast.title) {
              <p class="tkf-toast__title">{{ toast.title }}</p>
            }
            <p class="tkf-toast__message">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            class="tkf-toast__close"
            (click)="toasts.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tkf-toasts {
        position: fixed;
        bottom: var(--spacing-4);
        right: var(--spacing-4);
        z-index: 1100;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
        max-width: min(24rem, calc(100vw - 2 * var(--spacing-4)));
      }
      .tkf-toast {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-2);
        padding: var(--spacing-3);
        border-radius: var(--radius-md);
        background: var(--color-background-default);
        border: 1px solid var(--color-neutral-200);
        border-left: 3px solid var(--color-neutral-400);
        box-shadow: var(--shadow-lg);
        font-family: var(--font-family-sans);
        animation: tkf-toast-in 160ms cubic-bezier(0, 0, 0.2, 1);
      }
      .tkf-toast[data-variant='success'] {
        border-left-color: var(--color-semantic-success);
      }
      .tkf-toast[data-variant='error'] {
        border-left-color: var(--color-semantic-danger);
      }
      .tkf-toast[data-variant='warning'] {
        border-left-color: var(--color-semantic-warning);
      }
      .tkf-toast[data-variant='info'] {
        border-left-color: var(--color-semantic-info);
      }
      .tkf-toast__icon {
        font-size: var(--font-size-sm);
        line-height: var(--font-line-height-normal);
      }
      .tkf-toast__content {
        flex: 1;
        min-width: 0;
      }
      .tkf-toast__title {
        margin: 0 0 2px;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-default);
      }
      .tkf-toast__message {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
        word-break: break-word;
      }
      .tkf-toast__close {
        border: none;
        background: transparent;
        cursor: pointer;
        color: var(--color-foreground-subtle);
        font-size: var(--font-size-sm);
        line-height: 1;
        padding: 2px;
        border-radius: var(--radius-sm);
      }
      .tkf-toast__close:hover {
        color: var(--color-foreground-default);
      }
      .tkf-toast__close:focus-visible {
        outline: 2px solid var(--color-brand-500);
        outline-offset: 1px;
      }
      @keyframes tkf-toast-in {
        from {
          opacity: 0;
          transform: translateX(12px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .tkf-toast {
          animation: none;
        }
      }
    `,
  ],
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);

  protected icon(variant: string): string {
    switch (variant) {
      case 'success':
        return '✓';
      case 'error':
        return '⚠';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  }
}
