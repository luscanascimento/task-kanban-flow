import { TestBed } from '@angular/core/testing';

import type { BoardDto, TeamDto, TeamMemberDto, UserDto } from '@tkf/shared-types';

import { TeamDetailStore } from './team-detail-store';

function user(id: string): UserDto {
  return {
    id,
    email: `${id}@example.com`,
    displayName: id,
    role: 'member',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function member(id: string): TeamMemberDto {
  return { user: user(id), role: 'member', joinedAt: '2026-01-01T00:00:00.000Z' };
}

function team(id: string, members: TeamMemberDto[] = []): TeamDto {
  return {
    id,
    name: id,
    ownerId: 'user-1',
    members,
    boardCount: members.length,
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('TeamDetailStore', () => {
  let store: InstanceType<typeof TeamDetailStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TeamDetailStore] });
    store = TestBed.inject(TeamDetailStore);
  });

  it('starts with a null team, no boards, not loading, no error', () => {
    expect(store.team()).toBeNull();
    expect(store.boards()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.members()).toEqual([]);
    expect(store.boardCount()).toBe(0);
    expect(store.isEmpty()).toBe(false);
  });

  it('setTeam exposes members via the computed signal', () => {
    store.setTeam(team('t1', [member('u1'), member('u2')]));

    expect(store.members().map((m) => m.user.id)).toEqual(['u1', 'u2']);
  });

  it('isEmpty is true only when a team is set but it has no boards', () => {
    store.setTeam(team('t1'));
    expect(store.isEmpty()).toBe(true);

    store.setBoards([board('b1')]);
    expect(store.isEmpty()).toBe(false);
  });

  it('setBoards replaces the boards list', () => {
    store.setBoards([board('b1'), board('b2')]);

    expect(store.boards().map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(store.boardCount()).toBe(2);
  });

  it('addBoard appends to the boards list', () => {
    store.setBoards([board('b1')]);

    store.addBoard(board('b2'));

    expect(store.boards().map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('removeBoard filters out the board by id', () => {
    store.setBoards([board('b1'), board('b2')]);

    store.removeBoard('b1');

    expect(store.boards().map((b) => b.id)).toEqual(['b2']);
    expect(store.boardCount()).toBe(1);
  });

  it('setError sets the error and clears loading', () => {
    store.setLoading(true);

    store.setError('failed');

    expect(store.error()).toBe('failed');
    expect(store.isLoading()).toBe(false);
  });
});
