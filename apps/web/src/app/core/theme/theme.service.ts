import { Injectable, type Signal, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/**
 * ThemeService — signal-based theme manager. Mutates `[data-theme]` on
 * `<html>` and persists preference in `localStorage`. Components read
 * `theme()` reactively. No RxJS needed.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'tkf:theme';
  private readonly _theme = signal<Theme>(this.resolveInitial());
  readonly theme: Signal<Theme> = this._theme.asReadonly();

  setTheme(next: Theme): void {
    this._theme.set(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(this.storageKey, next);
  }

  toggle(): void {
    this.setTheme(this._theme() === 'light' ? 'dark' : 'light');
  }

  private resolveInitial(): Theme {
    const stored = localStorage.getItem(this.storageKey) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
