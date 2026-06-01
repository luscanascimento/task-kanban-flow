import { type EnvironmentProviders, ErrorHandler, type Provider } from '@angular/core';
import * as Sentry from '@sentry/angular';

import { environment } from '../../../environments/environment';

/**
 * Sentry provider. Initialised with a no-op when `SENTRY_DSN` is empty
 * so the bundle still works in fresh clones and CI without credentials.
 * Set the env var in production to enable crash reporting.
 */
export function provideSentry(): EnvironmentProviders {
  if (environment.sentry.dsn) {
    Sentry.init({
      dsn: environment.sentry.dsn,
      environment: environment.sentry.environment,
      tracesSampleRate: environment.sentry.tracesSampleRate,
    });
  }
  const errorHandler: Provider = {
    provide: ErrorHandler,
    useValue: environment.sentry.dsn ? Sentry.angularErrorHandler() : new DefaultErrorHandler(),
  };
  return { ɵproviders: [errorHandler] } as unknown as EnvironmentProviders;
}

class DefaultErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error(error);
  }
}
