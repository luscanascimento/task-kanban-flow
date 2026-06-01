import { type HttpInterceptorFn } from '@angular/common/http';

import { JwtService } from './jwt.service';

/**
 * Functional HTTP interceptor that attaches the current access token
 * to outgoing requests. Refresh-on-401 logic will be implemented in
 * Phase 1 alongside the login flow.
 */
export const authHttpInterceptor: HttpInterceptorFn = (req, next) => {
  // Lazy-inject to avoid a constructor signature change in functional interceptors.
  const token = new JwtService().getAccessToken();
  if (!token) return next(req);

  const authed = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authed);
};
