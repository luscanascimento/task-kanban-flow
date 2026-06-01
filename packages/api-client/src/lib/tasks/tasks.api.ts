import { Injectable } from '@angular/core';

import type {
  CreateTaskRequestDto,
  MoveTaskRequestDto,
  TaskDto,
  UpdateTaskRequestDto,
} from '@tkf/shared-types';

import { BaseApiClient } from '../http/base-api.client';

/** TasksApi — typed HTTP client for task endpoints. Populated in Phase 1. */
@Injectable({ providedIn: 'root' })
export class TasksApi extends BaseApiClient {
  constructor() {
    super('/api');
  }

  listByBoard(boardId: string): Promise<ReadonlyArray<TaskDto>> {
    return this.get<ReadonlyArray<TaskDto>>(`/boards/${boardId}/tasks`);
  }

  create(payload: CreateTaskRequestDto): Promise<TaskDto> {
    return this.post<TaskDto>('/tasks', payload);
  }

  update(id: string, payload: UpdateTaskRequestDto): Promise<TaskDto> {
    return this.patch<TaskDto>(`/tasks/${id}`, payload);
  }

  move(id: string, payload: MoveTaskRequestDto): Promise<TaskDto> {
    return this.post<TaskDto>(`/tasks/${id}/move`, payload);
  }

  remove(id: string): Promise<void> {
    return this.delete<void>(`/tasks/${id}`);
  }
}
