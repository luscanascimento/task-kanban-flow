import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import type { UserDto } from '@tkf/shared-types';

import { authGuard } from './auth.guard';
import { AuthStore } from './auth-store';

function user(id: string): UserDto {
  return {
    id,
    email: `${id}@example.com`,
    displayName: id,
    role: 'member',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('authGuard', () => {
  let store: InstanceType<typeof AuthStore>;

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/boards' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    store = TestBed.inject(AuthStore);
  });

  it('allows activation when the user is authenticated', () => {
    store.setUser(user('u1'));

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBe(true);
  });

  it('redirects to /auth/login when the user is not authenticated', () => {
    store.setUser(null);

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBeInstanceOf(UrlTree);
    const expected = TestBed.inject(Router).parseUrl('/auth/login');
    expect((result as UrlTree).toString()).toBe(expected.toString());
  });

  it('redirects after a previously authenticated user is cleared', () => {
    store.setUser(user('u1'));
    store.clearUser();

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBeInstanceOf(UrlTree);
  });
});
