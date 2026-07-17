import { TestBed } from '@angular/core/testing';

import type { ApiKeyDto, ApiKeyScope } from '@tkf/shared-types';

import { ApiKeysStore } from './api-keys-store';

function key(id: string, scope: ApiKeyScope = 'read', revoked = false): ApiKeyDto {
  return {
    id,
    name: id,
    display: `tkf_${id}`,
    scope,
    createdAt: '2026-01-01T00:00:00.000Z',
    revoked,
  };
}

describe('ApiKeysStore', () => {
  let store: InstanceType<typeof ApiKeysStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ApiKeysStore] });
    store = TestBed.inject(ApiKeysStore);
  });

  it('starts empty, not loading, without error', () => {
    expect(store.keys()).toEqual([]);
    expect(store.isEmpty()).toBe(true);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('setKeys replaces the list and clears loading + error', () => {
    store.setLoading(true);
    store.setError('boom');

    store.setKeys([key('a'), key('b')]);

    expect(store.keys().map((k) => k.id)).toEqual(['a', 'b']);
    expect(store.isEmpty()).toBe(false);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('upsert prepends a new key (newest first)', () => {
    store.setKeys([key('a')]);

    store.upsert(key('b'));

    expect(store.keys().map((k) => k.id)).toEqual(['b', 'a']);
  });

  it('markRevoked flags the key and excludes it from activeKeys', () => {
    store.setKeys([key('a'), key('b')]);

    store.markRevoked('a');

    expect(store.keys().find((k) => k.id === 'a')?.revoked).toBe(true);
    expect(store.activeKeys().map((k) => k.id)).toEqual(['b']);
  });

  it('setError sets the error and clears loading', () => {
    store.setLoading(true);

    store.setError('failed');

    expect(store.error()).toBe('failed');
    expect(store.isLoading()).toBe(false);
  });
});
