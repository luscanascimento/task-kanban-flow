import { TestBed } from '@angular/core/testing';

import type { BoardDto, ClientDto } from '@tkf/shared-types';

import { ClientDetailStore } from './client-detail-store';

function client(id: string): ClientDto {
  return {
    id,
    name: id,
    boardCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function board(id: string): BoardDto {
  return {
    id,
    teamId: 't1',
    title: id,
    visibility: 'private',
    ownerId: 'user-1',
    members: [],
    clientId: 'c1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('ClientDetailStore', () => {
  let store: InstanceType<typeof ClientDetailStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ClientDetailStore] });
    store = TestBed.inject(ClientDetailStore);
  });

  it('starts with a null client, no boards, not loading, no error', () => {
    expect(store.client()).toBeNull();
    expect(store.boards()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.hasBoards()).toBe(false);
    expect(store.isReady()).toBe(false);
  });

  it('isReady becomes true once a client is set', () => {
    store.setClient(client('c1'));

    expect(store.isReady()).toBe(true);
    expect(store.client()?.id).toBe('c1');
  });

  it('hasBoards reflects whether boards are present', () => {
    expect(store.hasBoards()).toBe(false);

    store.setBoards([board('b1')]);

    expect(store.hasBoards()).toBe(true);
    expect(store.boards().map((b) => b.id)).toEqual(['b1']);
  });

  it('setBoards replaces the boards list', () => {
    store.setBoards([board('b1')]);
    store.setBoards([board('b2'), board('b3')]);

    expect(store.boards().map((b) => b.id)).toEqual(['b2', 'b3']);
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
