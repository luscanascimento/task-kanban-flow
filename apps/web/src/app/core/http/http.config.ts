import { type EnvironmentProviders, provideHttpClient, withInterceptors } from '@angular/common/http';

import { authHttpInterceptor } from '../auth/infrastructure/auth-http.interceptor';

/** Compose HTTP providers — JWT interceptor + standard HttpClient. */
export function provideHttp(): EnvironmentProviders {
  return provideHttpClient(withInterceptors([authHttpInterceptor]));
}
