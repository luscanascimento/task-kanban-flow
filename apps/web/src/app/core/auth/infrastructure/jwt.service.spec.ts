import { TestBed } from '@angular/core/testing';

import { JwtService } from './jwt.service';

const ACCESS_KEY = 'tkf:access-token';
const REFRESH_KEY = 'tkf:refresh-token';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [JwtService] });
    service = TestBed.inject(JwtService);
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('round-trips stored tokens through the getters', () => {
    service.storeTokens('access-abc', 'refresh-xyz');

    expect(service.getAccessToken()).toBe('access-abc');
    expect(service.getRefreshToken()).toBe('refresh-xyz');
  });

  it('persists tokens under the namespaced storage keys', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');

    service.storeTokens('access-abc', 'refresh-xyz');

    expect(setItem).toHaveBeenCalledWith(ACCESS_KEY, 'access-abc');
    expect(setItem).toHaveBeenCalledWith(REFRESH_KEY, 'refresh-xyz');
    expect(localStorage.getItem(ACCESS_KEY)).toBe('access-abc');
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-xyz');
  });

  it('returns null from both getters when nothing is stored', () => {
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });

  it('clear() removes both tokens', () => {
    service.storeTokens('access-abc', 'refresh-xyz');

    service.clear();

    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it('clear() removes exactly the two namespaced keys', () => {
    const removeItem = jest.spyOn(Storage.prototype, 'removeItem');

    service.clear();

    expect(removeItem).toHaveBeenCalledWith(ACCESS_KEY);
    expect(removeItem).toHaveBeenCalledWith(REFRESH_KEY);
  });
});
