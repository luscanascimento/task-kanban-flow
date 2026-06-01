import { Injectable } from '@angular/core';

import type { BoardDto, CreateBoardRequestDto, UpdateBoardRequestDto } from '@tkf/shared-types';

import { BaseApiClient } from '../http/base-api.client';

/** BoardsApi — typed HTTP client for board endpoints. Populated in Phase 1. */
@Injectable({ providedIn: 'root' })
export class BoardsApi extends BaseApiClient {
  constructor() {
    super('/api');
  }

  list(): Promise<ReadonlyArray<BoardDto>> {
    return this.get<ReadonlyArray<BoardDto>>('/boards');
  }

  create(payload: CreateBoardRequestDto): Promise<BoardDto> {
    return this.post<BoardDto>('/boards', payload);
  }

  update(id: string, payload: UpdateBoardRequestDto): Promise<BoardDto> {
    return this.patch<BoardDto>(`/boards/${id}`, payload);
  }

  remove(id: string): Promise<void> {
    return this.delete<void>(`/boards/${id}`);
  }
}
