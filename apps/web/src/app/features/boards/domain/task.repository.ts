import { InjectionToken } from '@angular/core';

import type {
  AddTaskAttachmentRequestDto,
  CreateTaskRequestDto,
  MoveTaskRequestDto,
  TaskDto,
  UpdateTaskRequestDto,
} from '@tkf/shared-types';

/**
 * Port for task persistence. Tasks live inside a column; `move`
 * captures the cross-column drag-and-drop operation as a first-class
 * intent (target column + target position) rather than a generic patch.
 */
export interface TaskRepository {
  listByBoard(boardId: string): Promise<ReadonlyArray<TaskDto>>;
  create(payload: CreateTaskRequestDto): Promise<TaskDto>;
  update(id: string, payload: UpdateTaskRequestDto): Promise<TaskDto>;
  move(id: string, payload: MoveTaskRequestDto): Promise<TaskDto>;
  remove(id: string): Promise<void>;
  addAttachment(id: string, payload: AddTaskAttachmentRequestDto): Promise<TaskDto>;
  removeAttachment(id: string, attachmentId: string): Promise<TaskDto>;
}

export const TASK_REPOSITORY = new InjectionToken<TaskRepository>('TASK_REPOSITORY');
