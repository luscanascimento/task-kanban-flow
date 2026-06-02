import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type {
  LoginRequestDto,
  LoginResponseDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
} from '@tkf/shared-types';

import { type AuthRepository } from '../domain/auth.repository';
import { environment } from '../../../../environments/environment';

/**
 * HTTP-based implementation of `AuthRepository`. Talks to the real API
 * (or, in dev/test, to MSW). Keep this class thin: any business rule
 * belongs in the domain/application layer.
 */
@Injectable({ providedIn: 'root' })
export class HttpAuthRepository implements AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  login(payload: LoginRequestDto): Promise<LoginResponseDto> {
    return firstValueFrom(this.http.post<LoginResponseDto>(`${this.baseUrl}/auth/login`, payload));
  }

  register(payload: RegisterRequestDto): Promise<LoginResponseDto> {
    return firstValueFrom(
      this.http.post<LoginResponseDto>(`${this.baseUrl}/auth/register`, payload),
    );
  }

  refresh(payload: RefreshTokenRequestDto): Promise<LoginResponseDto> {
    return firstValueFrom(
      this.http.post<LoginResponseDto>(`${this.baseUrl}/auth/refresh`, payload),
    );
  }

  logout(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/auth/logout`, {}));
  }
}
