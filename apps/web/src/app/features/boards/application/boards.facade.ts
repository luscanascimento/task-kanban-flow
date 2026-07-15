import { Injectable, inject } from '@angular/core';

import type { CreateBoardRequestDto, UpdateBoardRequestDto } from '@tkf/shared-types';

import { BOARD_REPOSITORY } from '../domain/board.repository';
import { BoardsStore } from '../presentation/boards-store';

/**
 * Application-layer orchestrator for the boards list. UI components depend
 * only on this facade (+ the store's read signals), never on repositories.
 */
@Injectable()
export class BoardsFacade {
  private readonly repo = inject(BOARD_REPOSITORY);
  private readonly store = inject(BoardsStore);

  readonly boards = this.store.boards;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;
  readonly isEmpty = this.store.isEmpty;
  readonly count = this.store.count;

  async load(): Promise<void> {
    try {
      this.store.setLoading(true);
      this.store.setBoards(await this.repo.list());
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to load boards.'));
    }
  }

  async create(payload: CreateBoardRequestDto): Promise<void> {
    try {
      this.store.upsertBoard(await this.repo.create(payload));
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to create board.'));
    }
  }

  async update(id: string, payload: UpdateBoardRequestDto): Promise<void> {
    try {
      this.store.upsertBoard(await this.repo.update(id, payload));
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to update board.'));
    }
  }

  async remove(id: string): Promise<void> {
    // Optimistic delete with rollback, mirroring the board-detail facade.
    const snapshot = this.store.boards();
    this.store.removeBoard(id);
    try {
      await this.repo.remove(id);
    } catch (e) {
      this.store.setBoards(snapshot);
      this.store.setError(toMessage(e, 'Failed to delete board.'));
    }
  }
}

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
