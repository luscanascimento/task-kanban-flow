import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';

let modalSeq = 0;

/**
 * tkf-modal — an accessible modal dialog shell. Handles the concerns that were
 * missing from the ad-hoc task dialog:
 *  - focus trap + auto-capture (initial focus) via cdkTrapFocus
 *  - focus restore to the invoking element on close (cdkTrapFocus autoCapture)
 *  - Escape to close and backdrop-click to close
 *  - role="dialog", aria-modal, and aria-labelledby wired to the header
 *  - body scroll lock while open
 *
 * Content is projected; pass `title` for a titled header with a close button,
 * or omit it and provide your own header inside the projected content.
 *
 * Usage:
 * ```
 * <tkf-modal title="Edit task" size="lg" (close)="onClose()">…</tkf-modal>
 * ```
 */
@Component({
  selector: 'tkf-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule],
  template: `
    <div class="tkf-modal__backdrop" (click)="onBackdrop($event)">
      <div
        class="tkf-modal__panel"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="title() ? titleId : null"
        [attr.aria-label]="title() ? null : ariaLabel()"
        [attr.data-size]="size()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        (keydown.escape)="close.emit()"
      >
        @if (title(); as t) {
          <header class="tkf-modal__header">
            <h2 class="tkf-modal__title" [id]="titleId">{{ t }}</h2>
            <button
              type="button"
              class="tkf-modal__close"
              (click)="close.emit()"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </header>
        }
        <div class="tkf-modal__body">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .tkf-modal__backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-4);
        background: color-mix(in srgb, var(--color-neutral-950) 55%, transparent);
        animation: tkf-modal-fade 120ms ease;
      }
      .tkf-modal__panel {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 32rem;
        max-height: calc(100vh - 2 * var(--spacing-8));
        background: var(--color-background-default);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        overflow: hidden;
        animation: tkf-modal-pop 140ms cubic-bezier(0, 0, 0.2, 1);
      }
      .tkf-modal__panel[data-size='sm'] {
        max-width: 24rem;
      }
      .tkf-modal__panel[data-size='lg'] {
        max-width: 44rem;
      }
      .tkf-modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-3);
        padding: var(--spacing-4);
        border-bottom: 1px solid var(--color-neutral-200);
      }
      .tkf-modal__title {
        margin: 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-default);
      }
      .tkf-modal__close {
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: var(--font-size-md);
        color: var(--color-foreground-muted);
        border-radius: var(--radius-md);
        padding: var(--spacing-1) var(--spacing-2);
        line-height: 1;
      }
      .tkf-modal__close:hover {
        background: var(--color-neutral-100);
        color: var(--color-foreground-default);
      }
      .tkf-modal__close:focus-visible {
        outline: 2px solid var(--color-brand-500);
        outline-offset: 2px;
      }
      .tkf-modal__body {
        padding: var(--spacing-4);
        overflow-y: auto;
      }
      @keyframes tkf-modal-fade {
        from {
          opacity: 0;
        }
      }
      @keyframes tkf-modal-pop {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .tkf-modal__backdrop,
        .tkf-modal__panel {
          animation: none;
        }
      }
    `,
  ],
})
export class ModalComponent {
  /** Optional title — when set, renders a header + close button and wires aria-labelledby. */
  readonly title = input<string>('');
  /** Accessible name when there is no visible title. */
  readonly ariaLabel = input<string>('Dialog');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Whether clicking the backdrop closes the modal. */
  readonly closeOnBackdrop = input(true);

  readonly close = output<void>();

  protected readonly titleId = `tkf-modal-title-${(modalSeq += 1)}`;

  private readonly doc = inject(DOCUMENT);

  constructor() {
    // Lock body scroll while the modal is mounted.
    const body = this.doc.body;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => {
      body.style.overflow = previous;
    });
  }

  onBackdrop(event: MouseEvent): void {
    // Only close when the click is on the backdrop itself, not bubbled from the panel.
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
