import { ErrorHandler, makeEnvironmentProviders, type Provider } from '@angular/core';
import * as Sentry from '@sentry/angular';

import { environment } from '../../../environments/environment';

/**
 * Sentry provider. `environment.sentry.dsn` is empty in both environment files,
 * so as checked in this is inert and the app falls back to a console
 * `ErrorHandler` — fresh clones and CI work without credentials. There is no
 * env-var plumbing: enabling it means editing `environment.prod.ts` and
 * rebuilding.
 */
export function provideSentry() {
  if (environment.sentry.dsn) {
    Sentry.init({
      dsn: environment.sentry.dsn,
      environment: environment.sentry.environment,
      tracesSampleRate: environment.sentry.tracesSampleRate,
    });
  }

  const errorHandler: Provider = {
    provide: ErrorHandler,
    useValue: environment.sentry.dsn ? Sentry.createErrorHandler() : new DefaultErrorHandler(),
  };

  return makeEnvironmentProviders([errorHandler]);
}

class DefaultErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error(error);
  }
}
