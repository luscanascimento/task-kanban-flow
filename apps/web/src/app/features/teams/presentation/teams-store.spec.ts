import { TestBed } from '@angular/core/testing';

import type { TeamDto } from '@tkf/shared-types';

import { TeamsStore } from './teams-store';

function team(id: string, name = id): TeamDto {
  return {
    id,
    name,
    ownerId: 'user-1',
    members: [],
    boardCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('TeamsStore', () => {
  let store: InstanceType<typeof TeamsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TeamsStore] });
    store = TestBed.inject(TeamsStore);
  });

  it('starts empty, not loading, without error', () => {
    expect(store.teams()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.isEmpty()).toBe(true);
  });

  it('setTeams replaces the list and clears loading + error', () => {
    store.setLoading(true);
    store.setError('boom');

    store.setTeams([team('t1'), team('t2')]);

    expect(store.teams().map((t) => t.id)).toEqual(['t1', 't2']);
    expect(store.isEmpty()).toBe(false);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('upsert appends a new team', () => {
    store.setTeams([team('t1')]);

    store.upsert(team('t2'));

    expect(store.teams().map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('upsert replaces an existing team by id (dedup)', () => {
    store.setTeams([team('t1', 'old'), team('t2')]);

    store.upsert(team('t1', 'new'));

    expect(store.teams()).toHaveLength(2);
    expect(store.teams().find((t) => t.id === 't1')?.name).toBe('new');
  });

  it('remove filters out the team by id', () => {
    store.setTeams([team('t1'), team('t2')]);

    store.remove('t1');

    expect(store.teams().map((t) => t.id)).toEqual(['t2']);
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
