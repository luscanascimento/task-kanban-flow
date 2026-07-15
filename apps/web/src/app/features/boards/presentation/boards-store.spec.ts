import { TestBed } from '@angular/core/testing';

import type { BoardDto } from '@tkf/shared-types';

import { BoardsStore } from './boards-store';

function board(id: string, title = id): BoardDto {
  return {
    id,
    teamId: 'team-1',
    title,
    visibility: 'private',
    ownerId: 'user-1',
    members: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('BoardsStore', () => {
  let store: InstanceType<typeof BoardsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BoardsStore] });
    store = TestBed.inject(BoardsStore);
  });

  it('starts empty, not loading, without error', () => {
    expect(store.boards()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.count()).toBe(0);
    expect(store.isEmpty()).toBe(true);
  });

  it('setBoards replaces the list and clears loading + error', () => {
    store.setLoading(true);
    store.setError('boom');

    store.setBoards([board('b1'), board('b2')]);

    expect(store.boards().map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(store.count()).toBe(2);
    expect(store.isEmpty()).toBe(false);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('upsertBoard appends a new board', () => {
    store.setBoards([board('b1')]);

    store.upsertBoard(board('b2'));

    expect(store.boards().map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('upsertBoard replaces an existing board by id (dedup)', () => {
    store.setBoards([board('b1', 'old'), board('b2')]);

    store.upsertBoard(board('b1', 'new'));

    expect(store.boards()).toHaveLength(2);
    expect(store.boards().find((b) => b.id === 'b1')?.title).toBe('new');
  });

  it('removeBoard filters out the board by id', () => {
    store.setBoards([board('b1'), board('b2')]);

    store.removeBoard('b1');

    expect(store.boards().map((b) => b.id)).toEqual(['b2']);
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
