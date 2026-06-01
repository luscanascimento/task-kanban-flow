import type { UserDto } from '@tkf/shared-types';

/**
 * Domain entity representing an authenticated session.
 * `accessToken`/`refreshToken` live only in the browser storage via
 * `JwtService`; the domain layer never touches storage directly.
 */
export interface AuthSession {
  readonly user: UserDto;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;
}

export function isSessionActive(session: AuthSession | null, now: Date = new Date()): boolean {
  return session !== null && session.expiresAt.getTime() > now.getTime();
}
