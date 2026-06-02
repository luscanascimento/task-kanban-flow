import { Injectable } from '@angular/core';

import type {
  LoginRequestDto,
  LoginResponseDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
} from '@tkf/shared-types';

import { BaseApiClient } from '../http/base-api.client';

/**
 * AuthApi — typed HTTP client for authentication endpoints.
 * Implementation is intentionally minimal in the scaffold; concrete
 * features (login form, refresh flow) land in Phase 1.
 */
@Injectable({ providedIn: 'root' })
export class AuthApi extends BaseApiClient {
  constructor() {
    super('/api');
  }

  login(payload: LoginRequestDto): Promise<LoginResponseDto> {
    return this.post<LoginResponseDto>('/auth/login', payload);
  }

  register(payload: RegisterRequestDto): Promise<LoginResponseDto> {
    return this.post<LoginResponseDto>('/auth/register', payload);
  }

  refresh(payload: RefreshTokenRequestDto): Promise<LoginResponseDto> {
    return this.post<LoginResponseDto>('/auth/refresh', payload);
  }

  logout(): Promise<void> {
    return this.post<void>('/auth/logout', {});
  }
}
