import { TestBed } from '@angular/core/testing';

import type { ClientDto } from '@tkf/shared-types';

import { ClientsStore } from './clients-store';

function client(id: string, name = id): ClientDto {
  return {
    id,
    name,
    boardCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('ClientsStore', () => {
  let store: InstanceType<typeof ClientsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ClientsStore] });
    store = TestBed.inject(ClientsStore);
  });

  it('starts empty, not loading, without error', () => {
    expect(store.clients()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.isEmpty()).toBe(true);
  });

  it('setClients replaces the list and clears loading + error', () => {
    store.setLoading(true);
    store.setError('boom');

    store.setClients([client('c1'), client('c2')]);

    expect(store.clients().map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(store.isEmpty()).toBe(false);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('upsert appends a new client', () => {
    store.setClients([client('c1')]);

    store.upsert(client('c2'));

    expect(store.clients().map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('upsert replaces an existing client by id (dedup)', () => {
    store.setClients([client('c1', 'old'), client('c2')]);

    store.upsert(client('c1', 'new'));

    expect(store.clients()).toHaveLength(2);
    expect(store.clients().find((c) => c.id === 'c1')?.name).toBe('new');
  });

  it('remove filters out the client by id', () => {
    store.setClients([client('c1'), client('c2')]);

    store.remove('c1');

    expect(store.clients().map((c) => c.id)).toEqual(['c2']);
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
