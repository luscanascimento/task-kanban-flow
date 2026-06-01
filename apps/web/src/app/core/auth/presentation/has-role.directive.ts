import { Directive, Input, TemplateRef, ViewContainerRef, inject, signal } from '@angular/core';

import type { UserRole } from '@tkf/shared-types';

import { AuthStore } from './auth-store';

/**
 * Structural directive that renders the embedded template only when the
 * current user has at least one of the required roles. Usage:
 *
 *   <ng-container *tkfHasRole="['admin', 'manager']">…</ng-container>
 *
 * For the scaffolding phase the directive reads from `AuthStore` directly.
 * In Phase 1 we'll add reactive binding to route data + permission sets.
 */
@Directive({
  selector: '[tkfHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly auth = inject(AuthStore);

  private readonly requiredRoles = signal<ReadonlyArray<UserRole>>([]);

  @Input() set tkfHasRole(roles: ReadonlyArray<UserRole>) {
    this.requiredRoles.set(roles);
    this.render();
  }

  private render(): void {
    const user = this.auth.currentUser();
    if (user && this.requiredRoles().includes(user.role)) {
      this.vcr.createEmbeddedView(this.templateRef);
    } else {
      this.vcr.clear();
    }
  }
}
