import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ButtonComponent, InputComponent } from '@tkf/ui';

import { AuthFacade } from '../../application/auth.facade';
import { AuthStore } from '../auth-store';

@Component({
  selector: 'tkf-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent],
  template: `
    <div class="tkf-auth-card">
      <h1 class="tkf-auth-card__title">Criar conta</h1>

      @if (store.error()) {
        <p class="tkf-auth-card__error" role="alert">{{ store.error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="tkf-auth-card__form">
        <label class="tkf-auth-card__field">
          <span>Nome</span>
          <input
            tkf-input
            type="text"
            formControlName="displayName"
            placeholder="Seu nome"
            [invalid]="displayNameInvalid"
            [describedBy]="displayNameInvalid ? 'register-name-error' : ''"
          />
          @if (displayNameInvalid) {
            <span id="register-name-error" class="tkf-auth-card__hint"
              >Mínimo de 2 caracteres.</span
            >
          }
        </label>

        <label class="tkf-auth-card__field">
          <span>Email</span>
          <input
            tkf-input
            type="email"
            formControlName="email"
            placeholder="seu@email.com"
            [invalid]="emailInvalid"
            [describedBy]="emailInvalid ? 'register-email-error' : ''"
          />
          @if (emailInvalid) {
            <span id="register-email-error" class="tkf-auth-card__hint"
              >Informe um email válido.</span
            >
          }
        </label>

        <label class="tkf-auth-card__field">
          <span>Senha</span>
          <input
            tkf-input
            type="password"
            formControlName="password"
            placeholder="Mínimo 6 caracteres"
            [invalid]="passwordInvalid"
            [describedBy]="passwordInvalid ? 'register-password-error' : ''"
          />
          @if (passwordInvalid) {
            <span id="register-password-error" class="tkf-auth-card__hint"
              >Mínimo de 6 caracteres.</span
            >
          }
        </label>

        <button tkf-button type="submit" [disabled]="store.isLoading()">
          @if (store.isLoading()) {
            Criando conta...
          } @else {
            Cadastrar
          }
        </button>
      </form>

      <p class="tkf-auth-card__footer">
        Já tem conta?
        <a routerLink="/auth/login">Entrar</a>
      </p>
    </div>
  `,
  styles: [
    `
      .tkf-auth-card {
        max-width: 400px;
        margin: var(--spacing-16) auto;
        padding: var(--spacing-8);
        border-radius: var(--radius-lg);
        background: var(--color-background-default);
        box-shadow: var(--shadow-md);
      }
      .tkf-auth-card__title {
        margin: 0 0 var(--spacing-6);
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-foreground-default);
      }
      .tkf-auth-card__error {
        margin: 0 0 var(--spacing-4);
        padding: var(--spacing-2) var(--spacing-3);
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-semantic-danger) 10%, transparent);
        color: var(--color-semantic-danger);
        font-size: var(--font-size-sm);
      }
      .tkf-auth-card__form {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
      }
      .tkf-auth-card__field {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-foreground-default);
      }
      .tkf-auth-card__hint {
        font-size: var(--font-size-xs);
        color: var(--color-semantic-danger);
      }
      .tkf-auth-card__footer {
        margin: var(--spacing-6) 0 0;
        text-align: center;
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
      }
      .tkf-auth-card__footer a {
        color: var(--color-brand-600);
        text-decoration: none;
        font-weight: var(--font-weight-medium);
      }
    `,
  ],
})
export class RegisterComponent {
  private readonly facade = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly store = inject(AuthStore);

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get displayNameInvalid(): boolean {
    return this.form.controls.displayName.invalid && this.form.controls.displayName.touched;
  }

  get emailInvalid(): boolean {
    return this.form.controls.email.invalid && this.form.controls.email.touched;
  }

  get passwordInvalid(): boolean {
    return this.form.controls.password.invalid && this.form.controls.password.touched;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      await this.facade.register(this.form.getRawValue());
      this.router.navigate(['/']);
    } catch {
      // Error is already set in the store by the facade.
    }
  }
}
