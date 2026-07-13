import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';

import { AuthFacade } from './application/auth.facade';
import { AUTH_REPOSITORY } from './domain/auth.repository';
import { HttpAuthRepository } from './infrastructure/http-auth.repository';
import { JwtService } from './infrastructure/jwt.service';

/**
 * Wire auth DI bindings. Interceptor is registered via `provideHttp()`.
 *
 * The app initializer rehydrates the session on boot: if a refresh token
 * survived in storage, we silently exchange it for the current user so a
 * page reload keeps the user signed in (tokens alone aren't enough — the
 * in-memory `AuthStore` also needs the user record back).
 */
export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AUTH_REPOSITORY, useClass: HttpAuthRepository },
    provideAppInitializer(async () => {
      const jwt = inject(JwtService);
      const auth = inject(AuthFacade);
      if (jwt.getRefreshToken()) {
        try {
          await auth.refresh();
        } catch {
          // Invalid/expired token — start unauthenticated. `refresh()` already
          // clears storage + store on failure.
        }
      }
    }),
  ]);
}
