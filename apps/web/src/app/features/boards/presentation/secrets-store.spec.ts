import { TestBed } from '@angular/core/testing';

import type { ProjectSecretDto } from '@tkf/shared-types';

import { SecretsStore } from './secrets-store';

function secret(id: string, label = id): ProjectSecretDto {
  return {
    id,
    boardId: 'b1',
    platform: 'AWS',
    label,
    authType: 'api_key',
    secret: 'shhh',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('SecretsStore', () => {
  let store: InstanceType<typeof SecretsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SecretsStore] });
    store = TestBed.inject(SecretsStore);
  });

  it('starts empty, not loading, without error', () => {
    expect(store.secrets()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.count()).toBe(0);
    expect(store.isEmpty()).toBe(true);
  });

  it('setSecrets replaces the list and clears loading + error', () => {
    store.setLoading(true);
    store.setError('boom');

    store.setSecrets([secret('s1'), secret('s2')]);

    expect(store.secrets().map((s) => s.id)).toEqual(['s1', 's2']);
    expect(store.count()).toBe(2);
    expect(store.isEmpty()).toBe(false);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('upsert appends a new secret', () => {
    store.setSecrets([secret('s1')]);

    store.upsert(secret('s2'));

    expect(store.secrets().map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('upsert replaces an existing secret by id (dedup)', () => {
    store.setSecrets([secret('s1', 'old'), secret('s2')]);

    store.upsert(secret('s1', 'new'));

    expect(store.secrets()).toHaveLength(2);
    expect(store.secrets().find((s) => s.id === 's1')?.label).toBe('new');
  });

  it('remove filters out the secret by id', () => {
    store.setSecrets([secret('s1'), secret('s2')]);

    store.remove('s1');

    expect(store.secrets().map((s) => s.id)).toEqual(['s2']);
    expect(store.count()).toBe(1);
  });

  it('setLoading toggles the loading flag', () => {
    store.setLoading(true);
    expect(store.isLoading()).toBe(true);
  });

  it('setError sets the error and clears loading', () => {
    store.setLoading(true);

    store.setError('failed');

    expect(store.error()).toBe('failed');
    expect(store.isLoading()).toBe(false);
  });
});
