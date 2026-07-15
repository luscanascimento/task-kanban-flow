import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import type { LoginRequestDto, LoginResponseDto } from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { HttpAuthRepository } from './http-auth.repository';

const BASE = environment.apiBaseUrl;

function loginResponse(): LoginResponseDto {
  return {
    user: {
      id: 'u1',
      email: 'a@b.com',
      displayName: 'Ada',
      role: 'member',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    tokens: {
      accessToken: 'access',
      refreshToken: 'refresh',
      accessTokenExpiresAt: '2026-01-01T01:00:00.000Z',
      refreshTokenExpiresAt: '2026-01-08T00:00:00.000Z',
    },
  };
}

describe('HttpAuthRepository', () => {
  let repo: HttpAuthRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpAuthRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(HttpAuthRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs credentials to /auth/login and returns the parsed user + tokens', async () => {
    const payload: LoginRequestDto = { email: 'a@b.com', password: 'secret' };
    const response = loginResponse();

    const promise = repo.login(payload);

    const req = httpMock.expectOne(`${BASE}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(response);

    await expect(promise).resolves.toEqual(response);
  });
});
