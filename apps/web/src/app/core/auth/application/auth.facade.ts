import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import type { LoginRequestDto, RegisterRequestDto } from '@tkf/shared-types';

import { AUTH_REPOSITORY } from '../domain/auth.repository';
import { JwtService } from '../infrastructure/jwt.service';
import { AuthStore } from '../presentation/auth-store';

/**
 * AuthFacade — application-layer use case orchestrator.
 *
 * Coordinates the domain port (`AuthRepository`), infrastructure
 * (`JwtService`), presentation (`AuthStore`), and routing so that
 * UI components only depend on this single entry point.
 */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly repo = inject(AUTH_REPOSITORY);
  private readonly jwt = inject(JwtService);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  async login(payload: LoginRequestDto): Promise<void> {
    try {
      this.store.setLoading(true);
      const response = await this.repo.login(payload);
      this.jwt.storeTokens(response.tokens.accessToken, response.tokens.refreshToken);
      this.store.setUser(response.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed';
      this.store.setError(message);
      throw e;
    }
  }

  async register(payload: RegisterRequestDto): Promise<void> {
    try {
      this.store.setLoading(true);
      const response = await this.repo.register(payload);
      this.jwt.storeTokens(response.tokens.accessToken, response.tokens.refreshToken);
      this.store.setUser(response.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed';
      this.store.setError(message);
      throw e;
    }
  }

  async refresh(): Promise<void> {
    const refreshToken = this.jwt.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return;
    }
    const response = await this.repo.refresh({ refreshToken });
    this.jwt.storeTokens(response.tokens.accessToken, response.tokens.refreshToken);
    this.store.setUser(response.user);
  }

  async logout(): Promise<void> {
    try {
      await this.repo.logout();
    } finally {
      this.jwt.clear();
      this.store.clearUser();
      this.router.navigate(['/auth/login']);
    }
  }
}
