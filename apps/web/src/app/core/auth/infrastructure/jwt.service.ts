import { Injectable } from '@angular/core';

/**
 * Storage abstraction for JWT tokens. Uses `localStorage` so sessions
 * survive browser refresh. In SSR contexts, swap the underlying storage
 * via DI without touching call sites.
 *
 * ⚠ SECURITY NOTE: Tokens in localStorage are vulnerable to XSS. For a
 * production deployment, prefer `httpOnly` cookies set by the backend
 * and rotate CSRF protection. This service is intentionally simplistic
 * for the portfolio scaffolding phase — the architectural seam is what
 * matters; the storage strategy can change without code churn above.
 */
@Injectable({ providedIn: 'root' })
export class JwtService {
  private readonly accessTokenKey = 'tkf:access-token';
  private readonly refreshTokenKey = 'tkf:refresh-token';

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.accessTokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  clear(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
}
