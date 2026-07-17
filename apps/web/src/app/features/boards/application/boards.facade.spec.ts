import { TestBed } from '@angular/core/testing';

import { ToastService } from '@tkf/ui';
import type { BoardDto } from '@tkf/shared-types';

import { BOARD_REPOSITORY } from '../domain/board.repository';
import { BoardsStore } from '../presentation/boards-store';
import { BoardsFacade } from './boards.facade';

const TS = '2026-01-01T00:00:00.000Z';

function board(id = 'b1', title = 'Board'): BoardDto {
  return {
    id,
    teamId: 'team1',
    title,
    visibility: 'private',
    ownerId: 'u1',
    members: [],
    createdAt: TS,
    updatedAt: TS,
  };
}

describe('BoardsFacade', () => {
  let facade: BoardsFacade;
  let store: InstanceType<typeof BoardsStore>;
  let repo: {
    list: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let toast: { success: jest.Mock; error: jest.Mock; warning: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    repo = {
      list: jest.fn().mockResolvedValue([]),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    toast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        BoardsStore,
        BoardsFacade,
        { provide: BOARD_REPOSITORY, useValue: repo },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(BoardsFacade);
    store = TestBed.inject(BoardsStore);
  });

  describe('load', () => {
    it('sets boards from the repository on success', async () => {
      repo.list.mockResolvedValue([board('b1'), board('b2')]);

      await facade.load();

      expect(store.boards().map((b) => b.id)).toEqual(['b1', 'b2']);
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('sets the store error on repository failure', async () => {
      repo.list.mockRejectedValue(new Error('down'));

      await facade.load();

      expect(store.error()).toBe('down');
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('create', () => {
    it('upserts the created board and toasts success', async () => {
      repo.create.mockResolvedValue(board('new'));

      await facade.create({ teamId: 'team1', title: 'New' } as never);

      expect(store.boards().map((b) => b.id)).toEqual(['new']);
      expect(toast.success).toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('toasts error and leaves the list unchanged on failure', async () => {
      store.setBoards([board('b1')]);
      repo.create.mockRejectedValue(new Error('nope'));

      await facade.create({ teamId: 'team1', title: 'New' } as never);

      expect(store.boards().map((b) => b.id)).toEqual(['b1']);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('upserts the updated board on success', async () => {
      store.setBoards([board('b1', 'Old')]);
      repo.update.mockResolvedValue(board('b1', 'Renamed'));

      await facade.update('b1', { title: 'Renamed' } as never);

      expect(store.boards().find((b) => b.id === 'b1')?.title).toBe('Renamed');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('toasts error on failure', async () => {
      store.setBoards([board('b1', 'Old')]);
      repo.update.mockRejectedValue(new Error('nope'));

      await facade.update('b1', { title: 'Renamed' } as never);

      expect(store.boards().find((b) => b.id === 'b1')?.title).toBe('Old');
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    beforeEach(() => store.setBoards([board('b1'), board('b2')]));

    it('optimistically removes then confirms on success', async () => {
      repo.remove.mockResolvedValue(undefined);

      await facade.remove('b1');

      expect(store.boards().map((b) => b.id)).toEqual(['b2']);
      expect(toast.success).toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('restores the snapshot and toasts on failure', async () => {
      repo.remove.mockRejectedValue(new Error('boom'));

      await facade.remove('b1');

      expect(store.boards().map((b) => b.id)).toEqual(['b1', 'b2']);
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
