import { inject } from '@angular/core';
import { HttpClient, type HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  type Observable,
  catchError,
  finalize,
  map,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';

import { environment } from '../../../../environments/environment';

import { JwtService } from './jwt.service';

/**
 * A single in-flight refresh shared across every request that 401s while it is
 * pending. Without this, concurrent requests (e.g. the board loads four in
 * parallel) would each try to refresh — or, worse, be dropped — instead of
 * queueing onto one refresh and retrying with the new token.
 */
let refresh$: Observable<string> | null = null;

interface RefreshResponse {
  tokens: { accessToken: string; refreshToken: string };
}

/**
 * Functional HTTP interceptor that:
 * 1. Attaches the current access token to outgoing requests.
 * 2. On 401, refreshes the token (coalescing concurrent 401s onto one refresh)
 *    and retries the original request with the new token.
 * 3. On refresh failure, clears credentials and redirects to login.
 */
export const authHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const jwt = inject(JwtService);
  const http = inject(HttpClient);
  const router = inject(Router);

  const token = jwt.getAccessToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      const status = (error as { status?: number }).status;
      const isAuthEndpoint = req.url.includes('/auth/refresh') || req.url.includes('/auth/login');
      if (status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      const refreshToken = jwt.getRefreshToken();
      if (!refreshToken) {
        jwt.clear();
        void router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      // Start a refresh only if one isn't already in flight; late 401s share it.
      refresh$ ??= http
        .post<RefreshResponse>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken })
        .pipe(
          map((response) => {
            jwt.storeTokens(response.tokens.accessToken, response.tokens.refreshToken);
            return response.tokens.accessToken;
          }),
          catchError((refreshError: unknown) => {
            jwt.clear();
            void router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          }),
          // Clear the shared ref once settled so a later 401 refreshes anew.
          finalize(() => {
            refresh$ = null;
          }),
          shareReplay(1),
        );

      return refresh$.pipe(
        switchMap((accessToken) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })),
        ),
      );
    }),
  );
};
