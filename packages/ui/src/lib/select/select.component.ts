import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  forwardRef,
  inject,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * tkf-select — design-system styled native `<select>` with a ControlValueAccessor
 * so it drops into Reactive Forms and ngModel. Options are projected.
 *
 * Usage: `<select tkf-select formControlName="role"><option …></select>`
 */
@Component({
  selector: 'select[tkf-select]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true },
  ],
  host: {
    '[attr.data-invalid]': 'invalid || null',
    '[attr.aria-invalid]': 'invalid || null',
    '(change)': 'onChangeEvent($event)',
    '(blur)': 'onTouched()',
  },
  template: '<ng-content />',
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
        color: var(--color-foreground-default);
        background: var(--color-background-default);
        cursor: pointer;
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
      :host:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class SelectComponent implements ControlValueAccessor {
  @Input() invalid = false;

  private readonly el = inject<ElementRef<HTMLSelectElement>>(ElementRef);
  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.el.nativeElement.value = value ?? '';
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }
  onChangeEvent(event: Event): void {
    this.onChange((event.target as HTMLSelectElement).value);
  }
}
