import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { environment } from '../../../../environments/environment';

import { authHttpInterceptor } from './auth-http.interceptor';
import { JwtService } from './jwt.service';

const API = environment.apiBaseUrl;

describe('authHttpInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let jwt: {
    getAccessToken: jest.Mock;
    getRefreshToken: jest.Mock;
    storeTokens: jest.Mock;
    clear: jest.Mock;
  };
  let router: { navigate: jest.Mock };

  function setup(): void {
    jwt = {
      getAccessToken: jest.fn(),
      getRefreshToken: jest.fn(),
      storeTokens: jest.fn(),
      clear: jest.fn(),
    };
    router = { navigate: jest.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authHttpInterceptor])),
        provideHttpClientTesting(),
        { provide: JwtService, useValue: jwt },
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => setup());

  afterEach(() => httpMock.verify());

  it('attaches a Bearer token when an access token exists', () => {
    jwt.getAccessToken.mockReturnValue('access-1');

    http.get(`${API}/boards`).subscribe();

    const req = httpMock.expectOne(`${API}/boards`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush({});
  });

  it('does not attach an Authorization header when no token exists', () => {
    jwt.getAccessToken.mockReturnValue(null);

    http.get(`${API}/boards`).subscribe();

    const req = httpMock.expectOne(`${API}/boards`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('refreshes on 401 and retries the original request with the new token', () => {
    jwt.getAccessToken.mockReturnValue('stale');
    jwt.getRefreshToken.mockReturnValue('refresh-1');

    const result = jest.fn();
    http.get(`${API}/boards`).subscribe(result);

    // Original request fails with 401.
    const first = httpMock.expectOne(`${API}/boards`);
    expect(first.request.headers.get('Authorization')).toBe('Bearer stale');
    first.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Interceptor posts to /auth/refresh with the refresh token.
    const refresh = httpMock.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush({ tokens: { accessToken: 'fresh', refreshToken: 'refresh-2' } });

    expect(jwt.storeTokens).toHaveBeenCalledWith('fresh', 'refresh-2');

    // Original request is retried carrying the fresh token.
    const retried = httpMock.expectOne(`${API}/boards`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh');
    retried.flush({ ok: true });

    expect(result).toHaveBeenCalledWith({ ok: true });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('coalesces concurrent 401s into ONE refresh and retries both requests', () => {
    jwt.getAccessToken.mockReturnValue('stale');
    jwt.getRefreshToken.mockReturnValue('refresh-1');

    const resultA = jest.fn();
    const resultB = jest.fn();
    http.get(`${API}/boards`).subscribe(resultA);
    http.get(`${API}/tasks`).subscribe(resultB);

    // Both in-flight requests 401.
    httpMock.expectOne(`${API}/boards`).flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(`${API}/tasks`).flush({}, { status: 401, statusText: 'Unauthorized' });

    // Exactly one refresh is issued for both 401s.
    const refreshes = httpMock.match(`${API}/auth/refresh`);
    expect(refreshes.length).toBe(1);
    refreshes[0].flush({ tokens: { accessToken: 'fresh', refreshToken: 'refresh-2' } });

    // Both original requests are retried with the fresh token.
    const retriedA = httpMock.expectOne(`${API}/boards`);
    const retriedB = httpMock.expectOne(`${API}/tasks`);
    expect(retriedA.request.headers.get('Authorization')).toBe('Bearer fresh');
    expect(retriedB.request.headers.get('Authorization')).toBe('Bearer fresh');
    retriedA.flush({ from: 'boards' });
    retriedB.flush({ from: 'tasks' });

    expect(jwt.storeTokens).toHaveBeenCalledTimes(1);
    expect(resultA).toHaveBeenCalledWith({ from: 'boards' });
    expect(resultB).toHaveBeenCalledWith({ from: 'tasks' });
  });

  it('starts a fresh refresh for a later 401 after the first refresh settled', () => {
    jwt.getAccessToken.mockReturnValue('stale');
    jwt.getRefreshToken.mockReturnValue('refresh-1');

    // First full cycle: 401 -> refresh -> retry.
    const resultA = jest.fn();
    http.get(`${API}/boards`).subscribe(resultA);
    httpMock.expectOne(`${API}/boards`).flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(`${API}/auth/refresh`)
      .flush({ tokens: { accessToken: 'fresh', refreshToken: 'refresh-2' } });
    httpMock.expectOne(`${API}/boards`).flush({ ok: true });
    expect(resultA).toHaveBeenCalledWith({ ok: true });

    // The refresh has fully settled; refresh$ should have been reset to null.
    jwt.getRefreshToken.mockReturnValue('refresh-2');

    // Second wave: a later 401 must trigger a BRAND-NEW refresh.
    const resultB = jest.fn();
    http.get(`${API}/tasks`).subscribe(resultB);
    httpMock.expectOne(`${API}/tasks`).flush({}, { status: 401, statusText: 'Unauthorized' });

    const secondWave = httpMock.match(`${API}/auth/refresh`);
    expect(secondWave.length).toBe(1);
    expect(secondWave[0].request.body).toEqual({ refreshToken: 'refresh-2' });
    secondWave[0].flush({ tokens: { accessToken: 'fresher', refreshToken: 'refresh-3' } });

    const retriedB = httpMock.expectOne(`${API}/tasks`);
    expect(retriedB.request.headers.get('Authorization')).toBe('Bearer fresher');
    retriedB.flush({ ok: true });
    expect(resultB).toHaveBeenCalledWith({ ok: true });
  });

  it('does not leave refresh$ set after a failed refresh (a later 401 refreshes anew)', () => {
    jwt.getAccessToken.mockReturnValue('stale');
    jwt.getRefreshToken.mockReturnValue('refresh-1');

    // First cycle fails the refresh.
    const errorA = jest.fn();
    http.get(`${API}/boards`).subscribe({ error: errorA });
    httpMock.expectOne(`${API}/boards`).flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(`${API}/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(errorA).toHaveBeenCalled();

    // A later 401 must issue a fresh refresh POST, not reuse the failed one.
    const errorB = jest.fn();
    http.get(`${API}/tasks`).subscribe({ error: errorB });
    httpMock.expectOne(`${API}/tasks`).flush({}, { status: 401, statusText: 'Unauthorized' });

    const secondWave = httpMock.match(`${API}/auth/refresh`);
    expect(secondWave.length).toBe(1);
    secondWave[0].flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(errorB).toHaveBeenCalled();
  });

  it('clears tokens and navigates to /auth/login when refresh fails', () => {
    jwt.getAccessToken.mockReturnValue('stale');
    jwt.getRefreshToken.mockReturnValue('refresh-1');

    const error = jest.fn();
    http.get(`${API}/boards`).subscribe({ error });

    httpMock.expectOne(`${API}/boards`).flush({}, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne(`${API}/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(jwt.clear).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(error).toHaveBeenCalled();
  });

  it('clears tokens and redirects immediately on 401 when no refresh token exists', () => {
    jwt.getAccessToken.mockReturnValue('stale');
    jwt.getRefreshToken.mockReturnValue(null);

    const error = jest.fn();
    http.get(`${API}/boards`).subscribe({ error });

    httpMock.expectOne(`${API}/boards`).flush({}, { status: 401, statusText: 'Unauthorized' });

    // No refresh attempt is made.
    httpMock.expectNone(`${API}/auth/refresh`);
    expect(jwt.clear).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(error).toHaveBeenCalled();
  });

  it('does not attempt a refresh for a 401 from the login endpoint', () => {
    jwt.getAccessToken.mockReturnValue(null);

    const error = jest.fn();
    http.post(`${API}/auth/login`, { email: 'a@b.c' }).subscribe({ error });

    httpMock.expectOne(`${API}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone(`${API}/auth/refresh`);
    expect(jwt.clear).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });

  it('propagates non-401 errors without refreshing', () => {
    jwt.getAccessToken.mockReturnValue('access-1');

    const error = jest.fn();
    http.get(`${API}/boards`).subscribe({ error });

    httpMock.expectOne(`${API}/boards`).flush({}, { status: 500, statusText: 'Server Error' });

    httpMock.expectNone(`${API}/auth/refresh`);
    expect(error).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
