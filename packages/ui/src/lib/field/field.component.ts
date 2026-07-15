import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * tkf-field — a form-control wrapper providing a consistent label + control +
 * hint/error layout. The `<label>` wraps the projected control, so the label
 * is implicitly associated (no id wiring needed). Errors render with
 * role="alert" so screen readers announce them.
 *
 * Usage:
 * ```
 * <tkf-field label="Email" [error]="emailError()">
 *   <input tkf-input formControlName="email" type="email" />
 * </tkf-field>
 * ```
 */
@Component({
  selector: 'tkf-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="tkf-field">
      @if (label()) {
        <span class="tkf-field__label">
          {{ label() }}
          @if (required()) {
            <span class="tkf-field__required" aria-hidden="true">*</span>
          }
        </span>
      }
      <ng-content />
      @if (error()) {
        <span class="tkf-field__error" role="alert">{{ error() }}</span>
      } @else if (hint()) {
        <span class="tkf-field__hint">{{ hint() }}</span>
      }
    </label>
  `,
  styles: [
    `
      .tkf-field {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
      }
      .tkf-field__label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-foreground-default);
      }
      .tkf-field__required {
        color: var(--color-semantic-danger);
      }
      .tkf-field__hint {
        font-size: var(--font-size-xs);
        color: var(--color-foreground-muted);
      }
      .tkf-field__error {
        font-size: var(--font-size-xs);
        color: var(--color-semantic-danger);
      }
    `,
  ],
})
export class FieldComponent {
  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input(false);
}
