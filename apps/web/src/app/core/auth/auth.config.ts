import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { AUTH_REPOSITORY } from './domain/auth.repository';
import { HttpAuthRepository } from './infrastructure/http-auth.repository';

/** Wire auth DI bindings. Interceptor is registered via `provideHttp()`. */
export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: AUTH_REPOSITORY, useClass: HttpAuthRepository }]);
}
