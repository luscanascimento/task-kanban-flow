import { Injectable, computed, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  readonly id: number;
  readonly variant: ToastVariant;
  readonly message: string;
  readonly title?: string;
}

interface ShowOptions {
  readonly title?: string;
  /** Auto-dismiss delay in ms; pass 0 to keep the toast until dismissed. */
  readonly duration?: number;
}

const DEFAULT_DURATION = 4000;

/**
 * Root-provided toast/snackbar service. Facades and components call
 * `success`/`error`/`info`/`warning` to surface async feedback; the
 * `tkf-toast-container` (mounted once at app root) renders the queue.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<ReadonlyArray<Toast>>([]);
  readonly toasts = computed(() => this._toasts());

  private seq = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(variant: ToastVariant, message: string, options: ShowOptions = {}): number {
    const id = (this.seq += 1);
    const toast: Toast = {
      id,
      variant,
      message,
      ...(options.title ? { title: options.title } : {}),
    };
    this._toasts.update((list) => [...list, toast]);

    const duration = options.duration ?? DEFAULT_DURATION;
    if (duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    }
    return id;
  }

  success(message: string, options?: ShowOptions): number {
    return this.show('success', message, options);
  }
  error(message: string, options?: ShowOptions): number {
    // Errors default to sticky so users don't miss them.
    return this.show('error', message, { duration: 0, ...options });
  }
  warning(message: string, options?: ShowOptions): number {
    return this.show('warning', message, options);
  }
  info(message: string, options?: ShowOptions): number {
    return this.show('info', message, options);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this._toasts.set([]);
  }
}
