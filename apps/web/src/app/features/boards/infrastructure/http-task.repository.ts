import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type {
  AddTaskAttachmentRequestDto,
  CreateTaskRequestDto,
  MoveTaskRequestDto,
  TaskDto,
  UpdateTaskRequestDto,
} from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { type TaskRepository } from '../domain/task.repository';

/** HTTP adapter for `TaskRepository`. */
@Injectable({ providedIn: 'root' })
export class HttpTaskRepository implements TaskRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listByBoard(boardId: string): Promise<ReadonlyArray<TaskDto>> {
    return firstValueFrom(
      this.http.get<ReadonlyArray<TaskDto>>(`${this.baseUrl}/boards/${boardId}/tasks`),
    );
  }

  create(payload: CreateTaskRequestDto): Promise<TaskDto> {
    return firstValueFrom(this.http.post<TaskDto>(`${this.baseUrl}/tasks`, payload));
  }

  update(id: string, payload: UpdateTaskRequestDto): Promise<TaskDto> {
    return firstValueFrom(this.http.patch<TaskDto>(`${this.baseUrl}/tasks/${id}`, payload));
  }

  move(id: string, payload: MoveTaskRequestDto): Promise<TaskDto> {
    return firstValueFrom(this.http.post<TaskDto>(`${this.baseUrl}/tasks/${id}/move`, payload));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/tasks/${id}`));
  }

  addAttachment(id: string, payload: AddTaskAttachmentRequestDto): Promise<TaskDto> {
    return firstValueFrom(
      this.http.post<TaskDto>(`${this.baseUrl}/tasks/${id}/attachments`, payload),
    );
  }

  removeAttachment(id: string, attachmentId: string): Promise<TaskDto> {
    return firstValueFrom(
      this.http.delete<TaskDto>(`${this.baseUrl}/tasks/${id}/attachments/${attachmentId}`),
    );
  }
}
