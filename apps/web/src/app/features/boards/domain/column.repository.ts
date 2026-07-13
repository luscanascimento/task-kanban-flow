import { InjectionToken } from '@angular/core';

import type { ColumnDto, CreateColumnRequestDto, UpdateColumnRequestDto } from '@tkf/shared-types';

/**
 * Port for column persistence within a board. Columns are ordered by
 * their `position`; reordering is expressed as an explicit list of ids
 * so the adapter can persist the whole ordering atomically.
 */
export interface ColumnRepository {
  listByBoard(boardId: string): Promise<ReadonlyArray<ColumnDto>>;
  create(payload: CreateColumnRequestDto): Promise<ColumnDto>;
  update(id: string, payload: UpdateColumnRequestDto): Promise<ColumnDto>;
  reorder(
    boardId: string,
    orderedColumnIds: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<ColumnDto>>;
  remove(id: string): Promise<void>;
}

export const COLUMN_REPOSITORY = new InjectionToken<ColumnRepository>('COLUMN_REPOSITORY');
