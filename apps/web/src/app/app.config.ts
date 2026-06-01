import { type ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { provideAuth } from './core/auth/auth.config';
import { provideHttp } from './core/http/http.config';
import { provideSentry } from './core/sentry/sentry.config';
import { provideTheme } from './core/theme/theme.config';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless change detection — Angular 21 default for new apps.
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttp(),
    provideAuth(),
    provideTheme(),
    provideSentry(),
  ],
};
