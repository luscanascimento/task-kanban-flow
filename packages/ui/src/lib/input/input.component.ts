import { ChangeDetectionStrategy, Component, forwardRef, Input } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputVariant = 'outlined' | 'filled';

/**
 * tkf-input — base input of the design system.
 * Implements `ControlValueAccessor` for seamless Reactive Forms integration.
 *
 * Usage: `<input tkf-input formControlName="email" type="email" label="Email" />`
 */
@Component({
  selector: 'input[tkf-input]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  host: {
    '[attr.data-variant]': 'variant',
    '[attr.data-invalid]': 'invalid || null',
    '[attr.aria-invalid]': 'invalid || null',
    '[attr.aria-label]': 'label',
    '(input)': 'onInput($event)',
    '(blur)': 'onTouched()',
  },
  template: '',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        padding: var(--spacing-2) var(--spacing-3);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-neutral-200);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-sm);
        line-height: var(--font-line-height-normal);
        color: var(--color-foreground-default);
        background: var(--color-background-default);
        transition:
          border-color 120ms ease,
          box-shadow 120ms ease;
      }
      :host:focus {
        outline: none;
        border-color: var(--color-brand-500);
        box-shadow: 0 0 0 2px var(--color-brand-100);
      }
      :host[data-invalid] {
        border-color: var(--color-semantic-danger);
      }
      :host[data-invalid]:focus {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-semantic-danger) 25%, transparent);
      }
      :host[data-variant='filled'] {
        background: var(--color-background-subtle);
        border-color: transparent;
      }
      :host[data-variant='filled']:focus {
        border-color: var(--color-brand-500);
      }
      :host::placeholder {
        color: var(--color-neutral-400);
      }
      :host:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class InputComponent implements ControlValueAccessor {
  @Input() variant: InputVariant = 'outlined';
  @Input() label = '';
  @Input() invalid = false;

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(): void {
    // Native input value is managed by the host element; no-op here.
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(event: Event): void {
    this.onChange((event.target as HTMLInputElement).value);
  }
}
