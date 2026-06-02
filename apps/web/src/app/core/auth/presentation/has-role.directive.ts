import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';

import type { UserRole } from '@tkf/shared-types';

import { AuthStore } from './auth-store';

/**
 * Structural directive that renders the embedded template only when the
 * current user has at least one of the required roles. Usage:
 *
 *   <ng-container *tkfHasRole="['admin', 'manager']">…</ng-container>
 *
 * Reactive: re-evaluates when `AuthStore.currentUser` changes.
 */
@Directive({
  selector: '[tkfHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly auth = inject(AuthStore);

  @Input() tkfHasRole: ReadonlyArray<UserRole> = [];

  constructor() {
    effect(() => this.render());
  }

  private render(): void {
    const user = this.auth.currentUser();
    if (user && this.tkfHasRole.includes(user.role)) {
      this.vcr.createEmbeddedView(this.templateRef);
    } else {
      this.vcr.clear();
    }
  }
}
