import { TestBed } from '@angular/core/testing';

import type { ColumnDto, TaskDto } from '@tkf/shared-types';

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

function task(id: string, columnId: string, position: number): TaskDto {
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
});
