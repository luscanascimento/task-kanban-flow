import { inject } from '@angular/core';
import { HttpClient, type HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { JwtService } from './jwt.service';

let isRefreshing = false;

/**
 * Functional HTTP interceptor that:
 * 1. Attaches the current access token to outgoing requests.
 * 2. On 401, attempts a token refresh and retries the original request.
 * 3. On refresh failure, clears credentials and redirects to login.
 */
export const authHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const jwt = inject(JwtService);
  const http = inject(HttpClient);
  const router = inject(Router);

  const token = jwt.getAccessToken();
  let authReq = req;
  if (token) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/login')
      ) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        return throwError(() => error);
      }

      isRefreshing = true;
      const refreshToken = jwt.getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        jwt.clear();
        router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      return from(
        firstValueFrom(
          http.post<{
            tokens: { accessToken: string; refreshToken: string };
          }>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken }),
        ),
      ).pipe(
        switchMap((response) => {
          isRefreshing = false;
          jwt.storeTokens(response.tokens.accessToken, response.tokens.refreshToken);
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${response.tokens.accessToken}` },
          });
          return next(retryReq);
        }),
        catchError((refreshError) => {
          isRefreshing = false;
          jwt.clear();
          router.navigate(['/auth/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
