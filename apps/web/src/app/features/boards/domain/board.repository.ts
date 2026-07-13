import { InjectionToken } from '@angular/core';

import type { BoardDto, CreateBoardRequestDto, UpdateBoardRequestDto } from '@tkf/shared-types';

/**
 * Port (hexagonal architecture) for board persistence operations.
 * The infrastructure layer supplies a concrete HTTP implementation
 * (`HttpBoardRepository`); tests may provide an in-memory fake.
 *
 * A board is the aggregate root of the kanban domain — it owns its
 * columns, which in turn own their tasks.
 */
export interface BoardRepository {
  list(): Promise<ReadonlyArray<BoardDto>>;
  getById(id: string): Promise<BoardDto>;
  create(payload: CreateBoardRequestDto): Promise<BoardDto>;
  update(id: string, payload: UpdateBoardRequestDto): Promise<BoardDto>;
  remove(id: string): Promise<void>;
}

export const BOARD_REPOSITORY = new InjectionToken<BoardRepository>('BOARD_REPOSITORY');
