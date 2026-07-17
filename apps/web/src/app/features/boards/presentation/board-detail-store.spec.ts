import { TestBed } from '@angular/core/testing';

import type { BoardDto, ClientDto, ColumnDto, TaskDto, TaskPriority } from '@tkf/shared-types';

import { BoardDetailStore } from './board-detail-store';

function column(id: string, position: number, wipLimit?: number): ColumnDto {
  return {
    id,
    boardId: 'b1',
    title: id,
    position,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...(wipLimit !== undefined ? { wipLimit } : {}),
  };
}

function task(
  id: string,
  columnId: string,
  position: number,
  overrides: Partial<Pick<TaskDto, 'title' | 'description' | 'priority'>> = {},
): TaskDto {
  return {
    id,
    boardId: 'b1',
    columnId,
    title: id,
    priority: 'medium',
    status: 'backlog',
    position,
    labels: [],
    checklistItems: [],
    attachments: [],
    commentCount: 0,
    attachmentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function board(clientId?: string): BoardDto {
  return {
    id: 'b1',
    teamId: 'team1',
    title: 'Board 1',
    visibility: 'workspace',
    ownerId: 'u1',
    members: [],
    ...(clientId !== undefined ? { clientId } : {}),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function client(id: string, name = id): ClientDto {
  return {
    id,
    name,
    boardCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('BoardDetailStore', () => {
  let store: InstanceType<typeof BoardDetailStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BoardDetailStore] });
    store = TestBed.inject(BoardDetailStore);
  });

  it('groups tasks under their columns, ordered by position', () => {
    store.setColumns([column('todo', 1), column('backlog', 0)]);
    store.setTasks([task('t2', 'todo', 1), task('t1', 'todo', 0)]);

    const groups = store.columnsWithTasks();
    expect(groups.map((g) => g.column.id)).toEqual(['backlog', 'todo']);
    const todo = groups.find((g) => g.column.id === 'todo');
    expect(todo?.tasks.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('flags a column that exceeds its WIP limit', () => {
    store.setColumns([column('doing', 0, 1)]);
    store.setTasks([task('t1', 'doing', 0), task('t2', 'doing', 1)]);

    expect(store.columnsWithTasks().at(0)?.isOverWipLimit).toBe(true);
  });

  it('applies an optimistic move and returns the previous snapshot', () => {
    const initial = [task('a', 'todo', 0), task('b', 'todo', 1)];
    store.setColumns([column('todo', 0), column('done', 1)]);
    store.setTasks(initial);

    const snapshot = store.applyMove('a', 'done', 0);

    expect(snapshot).toBe(initial);
    expect(store.tasks().find((t) => t.id === 'a')?.columnId).toBe('done');
    expect(store.tasks().find((t) => t.id === 'b')?.position).toBe(0);
  });

  it('restores tasks from a snapshot on rollback', () => {
    const initial = [task('a', 'todo', 0)];
    store.setTasks(initial);
    store.applyMove('a', 'done', 0);

    store.restoreTasks(initial);

    expect(store.tasks()).toBe(initial);
  });

  describe('filters', () => {
    beforeEach(() => {
      store.setColumns([column('todo', 0), column('done', 1)]);
      store.setTasks([
        task('t1', 'todo', 0, { title: 'Fix login bug', priority: 'high' }),
        task('t2', 'todo', 1, { title: 'Write docs', description: 'about LOGIN flow' }),
        task('t3', 'done', 0, { title: 'Deploy', priority: 'high' }),
      ]);
    });

    it('returns the same reference as columnsWithTasks when no query and no priority', () => {
      expect(store.filteredColumnsWithTasks()).toBe(store.columnsWithTasks());
      expect(store.hasActiveFilters()).toBe(false);
    });

    it('filters by case-insensitive title substring', () => {
      store.setSearchQuery('LOGIN');
      const ids = store.filteredColumnsWithTasks().flatMap((g) => g.tasks.map((t) => t.id));
      expect(ids).toEqual(['t1', 't2']);
    });

    it('also matches on description', () => {
      store.setSearchQuery('flow');
      const ids = store.filteredColumnsWithTasks().flatMap((g) => g.tasks.map((t) => t.id));
      expect(ids).toEqual(['t2']);
    });

    it('filters by priority', () => {
      store.setPriorityFilter('high');
      const ids = store.filteredColumnsWithTasks().flatMap((g) => g.tasks.map((t) => t.id));
      expect(ids).toEqual(['t1', 't3']);
    });

    it('ANDs query and priority together', () => {
      store.setSearchQuery('login');
      store.setPriorityFilter('high');
      const ids = store.filteredColumnsWithTasks().flatMap((g) => g.tasks.map((t) => t.id));
      expect(ids).toEqual(['t1']);
    });

    it('filteredTaskCount sums filtered tasks across columns', () => {
      store.setPriorityFilter('high');
      expect(store.filteredTaskCount()).toBe(2);
    });

    it('hasActiveFilters reflects query or priority', () => {
      expect(store.hasActiveFilters()).toBe(false);
      store.setSearchQuery('  ');
      expect(store.hasActiveFilters()).toBe(false);
      store.setSearchQuery('x');
      expect(store.hasActiveFilters()).toBe(true);
      store.setSearchQuery('');
      store.setPriorityFilter('low' as TaskPriority);
      expect(store.hasActiveFilters()).toBe(true);
    });

    it('clearFilters resets both query and priority', () => {
      store.setSearchQuery('x');
      store.setPriorityFilter('high');

      store.clearFilters();

      expect(store.hasActiveFilters()).toBe(false);
      expect(store.filteredColumnsWithTasks()).toBe(store.columnsWithTasks());
    });
  });

  describe('boardClient', () => {
    it('resolves the client by board.clientId', () => {
      store.setBoard(board('c1'));
      store.setClients([client('c1', 'Acme'), client('c2')]);
      expect(store.boardClient()?.id).toBe('c1');
    });

    it('is null when the board has no clientId', () => {
      store.setBoard(board());
      store.setClients([client('c1')]);
      expect(store.boardClient()).toBeNull();
    });

    it('is null when the referenced client is not loaded', () => {
      store.setBoard(board('missing'));
      store.setClients([client('c1')]);
      expect(store.boardClient()).toBeNull();
    });
  });

  describe('isEmpty', () => {
    it('is false when no board is set', () => {
      expect(store.isEmpty()).toBe(false);
    });

    it('is true only when a board is set and it has zero columns', () => {
      store.setBoard(board());
      expect(store.isEmpty()).toBe(true);
      store.setColumns([column('todo', 0)]);
      expect(store.isEmpty()).toBe(false);
    });
  });

  describe('applyColumnReorder', () => {
    it('re-densifies positions to match the ordered ids and returns the prior snapshot', () => {
      const initial = [column('a', 0), column('b', 1), column('c', 2)];
      store.setColumns(initial);

      const snapshot = store.applyColumnReorder(['c', 'a', 'b']);

      expect(snapshot).toBe(initial);
      const positions = new Map(store.columns().map((c) => [c.id, c.position]));
      expect(positions.get('c')).toBe(0);
      expect(positions.get('a')).toBe(1);
      expect(positions.get('b')).toBe(2);
    });

    it('leaves columns not present in the id list untouched', () => {
      store.setColumns([column('a', 0), column('b', 5)]);

      store.applyColumnReorder(['a']);

      const positions = new Map(store.columns().map((c) => [c.id, c.position]));
      expect(positions.get('a')).toBe(0);
      expect(positions.get('b')).toBe(5);
    });
  });
});
