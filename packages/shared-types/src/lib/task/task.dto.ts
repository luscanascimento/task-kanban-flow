import type { UserDto } from '../auth/user.dto';

export type TaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'backlog' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

export interface TaskDto {
  readonly id: string;
  readonly boardId: string;
  readonly columnId: string;
  readonly title: string;
  readonly description?: string;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly position: number;
  readonly assigneeId?: string;
  readonly assignee?: UserDto;
  readonly dueDate?: string;
  readonly labels: ReadonlyArray<TaskLabelDto>;
  readonly checklistItems: ReadonlyArray<TaskChecklistItemDto>;
  readonly commentCount: number;
  readonly attachmentCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TaskLabelDto {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface TaskChecklistItemDto {
  readonly id: string;
  readonly text: string;
  readonly checked: boolean;
  readonly position: number;
}

export interface CreateTaskRequestDto {
  readonly boardId: string;
  readonly columnId: string;
  readonly title: string;
  readonly priority: TaskPriority;
  readonly assigneeId?: string;
  readonly dueDate?: string;
}

export interface UpdateTaskRequestDto {
  readonly title?: string;
  readonly description?: string;
  readonly priority?: TaskPriority;
  readonly status?: TaskStatus;
  readonly columnId?: string;
  readonly position?: number;
  readonly assigneeId?: string | null;
  readonly dueDate?: string | null;
}

export interface MoveTaskRequestDto {
  readonly targetColumnId: string;
  readonly targetPosition: number;
}
