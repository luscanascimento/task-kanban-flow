import { InjectionToken } from '@angular/core';

import type { LoginRequestDto, LoginResponseDto, RefreshTokenRequestDto } from '@tkf/shared-types';

/**
 * Port (hexagonal architecture) for authentication operations.
 * The infrastructure layer provides a concrete implementation
 * (`HttpAuthRepository`) that talks to the API. In tests, a fake
 * implementation can be supplied.
 */
export interface AuthRepository {
  login(payload: LoginRequestDto): Promise<LoginResponseDto>;
  refresh(payload: RefreshTokenRequestDto): Promise<LoginResponseDto>;
  logout(): Promise<void>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AUTH_REPOSITORY');
