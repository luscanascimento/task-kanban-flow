import { TestBed } from '@angular/core/testing';

import { ToastService } from '@tkf/ui';
import type { BoardDto, ColumnDto, TaskDto } from '@tkf/shared-types';

import { CLIENT_REPOSITORY } from '../../clients/domain/client.repository';
import { BOARD_REPOSITORY } from '../domain/board.repository';
import { COLUMN_REPOSITORY } from '../domain/column.repository';
import { TASK_REPOSITORY } from '../domain/task.repository';
import { BoardDetailStore } from '../presentation/board-detail-store';
import { BoardDetailFacade } from './board-detail.facade';

const TS = '2026-01-01T00:00:00.000Z';

function board(id = 'b1'): BoardDto {
  return {
    id,
    teamId: 'team1',
    title: 'Board',
    visibility: 'private',
    ownerId: 'u1',
    members: [],
    createdAt: TS,
    updatedAt: TS,
  };
}

function column(id: string, position: number): ColumnDto {
  return { id, boardId: 'b1', title: id, position, createdAt: TS, updatedAt: TS };
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
    createdAt: TS,
    updatedAt: TS,
  };
}

describe('BoardDetailFacade', () => {
  let facade: BoardDetailFacade;
  let store: InstanceType<typeof BoardDetailStore>;
  let boards: { getById: jest.Mock; update: jest.Mock };
  let columns: { listByBoard: jest.Mock; remove: jest.Mock; reorder: jest.Mock };
  let tasks: { listByBoard: jest.Mock; move: jest.Mock; remove: jest.Mock };
  let clients: { list: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock; warning: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    boards = { getById: jest.fn().mockResolvedValue(board()), update: jest.fn() };
    columns = {
      listByBoard: jest.fn().mockResolvedValue([]),
      remove: jest.fn(),
      reorder: jest.fn(),
    };
    tasks = { listByBoard: jest.fn().mockResolvedValue([]), move: jest.fn(), remove: jest.fn() };
    clients = { list: jest.fn().mockResolvedValue([]) };
    toast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        BoardDetailStore,
        BoardDetailFacade,
        { provide: BOARD_REPOSITORY, useValue: boards },
        { provide: COLUMN_REPOSITORY, useValue: columns },
        { provide: TASK_REPOSITORY, useValue: tasks },
        { provide: CLIENT_REPOSITORY, useValue: clients },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(BoardDetailFacade);
    store = TestBed.inject(BoardDetailStore);
  });

  it('load() populates the store from all four repositories', async () => {
    boards.getById.mockResolvedValue(board());
    columns.listByBoard.mockResolvedValue([column('todo', 0)]);
    tasks.listByBoard.mockResolvedValue([task('t1', 'todo', 0)]);

    await facade.load('b1');

    expect(store.board()?.id).toBe('b1');
    expect(store.orderedColumns()).toHaveLength(1);
    expect(store.taskCount()).toBe(1);
    expect(store.isLoading()).toBe(false);
  });

  describe('moveTask', () => {
    beforeEach(() => {
      store.setColumns([column('todo', 0), column('done', 1)]);
      store.setTasks([task('a', 'todo', 0), task('b', 'todo', 1)]);
    });

    it('persists the move and keeps the optimistic state on success', async () => {
      tasks.move.mockResolvedValue({ ...task('a', 'done', 0) });

      await facade.moveTask('a', 'done', 0);

      expect(tasks.move).toHaveBeenCalledWith('a', { targetColumnId: 'done', targetPosition: 0 });
      expect(store.tasks().find((t) => t.id === 'a')?.columnId).toBe('done');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('rolls back and toasts on failure', async () => {
      tasks.move.mockRejectedValue(new Error('boom'));

      await facade.moveTask('a', 'done', 0);

      expect(store.tasks().find((t) => t.id === 'a')?.columnId).toBe('todo');
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    beforeEach(() => store.setTasks([task('a', 'todo', 0)]));

    it('removes and toasts success', async () => {
      tasks.remove.mockResolvedValue(undefined);

      await facade.deleteTask('a');

      expect(store.tasks()).toHaveLength(0);
      expect(toast.success).toHaveBeenCalled();
    });

    it('restores the task and toasts on failure', async () => {
      tasks.remove.mockRejectedValue(new Error('nope'));

      await facade.deleteTask('a');

      expect(store.tasks().map((t) => t.id)).toEqual(['a']);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('deleteColumn', () => {
    beforeEach(() => {
      store.setColumns([column('todo', 0)]);
      store.setTasks([task('a', 'todo', 0)]);
    });

    it('restores columns AND tasks on failure', async () => {
      columns.remove.mockRejectedValue(new Error('nope'));

      await facade.deleteColumn('todo');

      expect(store.orderedColumns().map((c) => c.id)).toEqual(['todo']);
      expect(store.tasks().map((t) => t.id)).toEqual(['a']);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('reorderColumns', () => {
    beforeEach(() => {
      store.setBoard(board());
      store.setColumns([column('a', 0), column('b', 1), column('c', 2)]);
    });

    it('persists the new order on success', async () => {
      columns.reorder.mockResolvedValue([column('b', 0), column('a', 1), column('c', 2)]);

      await facade.reorderColumns(['b', 'a', 'c']);

      expect(columns.reorder).toHaveBeenCalledWith('b1', ['b', 'a', 'c']);
      expect(store.orderedColumns().map((c) => c.id)).toEqual(['b', 'a', 'c']);
    });

    it('rolls back to the previous order on failure', async () => {
      columns.reorder.mockRejectedValue(new Error('nope'));

      await facade.reorderColumns(['c', 'b', 'a']);

      expect(store.orderedColumns().map((c) => c.id)).toEqual(['a', 'b', 'c']);
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
