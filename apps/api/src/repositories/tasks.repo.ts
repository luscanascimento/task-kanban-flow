import type { Db } from '../db/client.js';
import { nowIso } from '../db/client.js';
import type {
  AddTaskAttachmentRequestDto,
  CreateTaskRequestDto,
  TaskAttachmentDto,
  TaskChecklistItemDto,
  TaskDto,
  TaskLabelDto,
  TaskPriority,
  TaskStatus,
  UpdateTaskRequestDto,
  UserDto,
} from '@tkf/shared-types';
import { newId } from '../db/client.js';
import { opt } from '../util/dto.js';

interface TaskRow {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  position: number;
  assignee_id: string | null;
  due_date: string | null;
  client_id: string | null;
  labels: string;
  checklist_items: string;
  attachments: string;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

function parseArray<T>(json: string): T[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export interface TasksRepo {
  listByBoard(boardId: string): TaskDto[];
  get(id: string): TaskDto | undefined;
  create(id: string, input: CreateTaskRequestDto): TaskDto;
  update(id: string, input: UpdateTaskRequestDto): TaskDto | undefined;
  move(id: string, targetColumnId: string, targetPosition: number): TaskDto | undefined;
  addAttachment(id: string, input: AddTaskAttachmentRequestDto): TaskDto | undefined;
  removeAttachment(id: string, attachmentId: string): TaskDto | undefined;
  remove(id: string): boolean;
}

export function createTasksRepo(db: Db): TasksRepo {
  const byId = db.prepare<[string]>(`SELECT * FROM tasks WHERE id = ?`);
  const byBoard = db.prepare<[string]>(
    `SELECT * FROM tasks WHERE board_id = ? ORDER BY column_id, position`,
  );
  const byColumn = db.prepare<[string]>(
    `SELECT id FROM tasks WHERE column_id = ? ORDER BY position`,
  );
  const userById = db.prepare<[string]>(`SELECT * FROM users WHERE id = ?`);
  const insert = db.prepare<
    [
      string,
      string,
      string,
      string,
      string,
      string,
      number,
      string | null,
      string | null,
      string | null,
      string,
      string,
    ]
  >(
    `INSERT INTO tasks (id, board_id, column_id, title, priority, status, position, assignee_id, due_date, client_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const del = db.prepare<[string]>(`DELETE FROM tasks WHERE id = ?`);
  const setPosition = db.prepare<[number, string]>(`UPDATE tasks SET position = ? WHERE id = ?`);

  function toDto(row: TaskRow): TaskDto {
    let assignee: UserDto | undefined;
    if (row.assignee_id) {
      const u = userById.get(row.assignee_id) as UserRow | undefined;
      if (u) {
        assignee = {
          id: u.id,
          email: u.email,
          displayName: u.display_name,
          ...opt('avatarUrl', u.avatar_url),
          role: u.role as UserDto['role'],
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        };
      }
    }
    const attachments = parseArray<TaskAttachmentDto>(row.attachments);
    return {
      id: row.id,
      boardId: row.board_id,
      columnId: row.column_id,
      title: row.title,
      ...opt('description', row.description),
      priority: row.priority as TaskPriority,
      status: row.status as TaskStatus,
      position: row.position,
      ...opt('assigneeId', row.assignee_id),
      ...opt('assignee', assignee),
      ...opt('dueDate', row.due_date),
      labels: parseArray<TaskLabelDto>(row.labels),
      checklistItems: parseArray<TaskChecklistItemDto>(row.checklist_items),
      attachments,
      ...opt('clientId', row.client_id),
      commentCount: row.comment_count,
      attachmentCount: attachments.length,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Dense-renumber the positions of a column's tasks (0,1,2,…). */
  function reindex(columnId: string): void {
    const ids = (byColumn.all(columnId) as { id: string }[]).map((r) => r.id);
    ids.forEach((id, index) => setPosition.run(index, id));
  }

  return {
    listByBoard(boardId) {
      return (byBoard.all(boardId) as TaskRow[]).map(toDto);
    },
    get(id) {
      const row = byId.get(id) as TaskRow | undefined;
      return row ? toDto(row) : undefined;
    },
    create(id, input) {
      const ts = nowIso();
      const { n } = db
        .prepare(`SELECT COUNT(*) AS n FROM tasks WHERE column_id = ?`)
        .get(input.columnId) as { n: number };
      insert.run(
        id,
        input.boardId,
        input.columnId,
        input.title,
        input.priority,
        'backlog',
        n,
        input.assigneeId ?? null,
        input.dueDate ?? null,
        input.clientId ?? null,
        ts,
        ts,
      );
      return toDto(byId.get(id) as TaskRow);
    },
    update(id, input) {
      const existing = byId.get(id) as TaskRow | undefined;
      if (!existing) {
        return undefined;
      }
      const assigneeId = input.assigneeId === undefined ? existing.assignee_id : input.assigneeId;
      const dueDate = input.dueDate === undefined ? existing.due_date : input.dueDate;
      const clientId = input.clientId === undefined ? existing.client_id : input.clientId;
      db.prepare(
        `UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, assignee_id = ?, due_date = ?, client_id = ?, updated_at = ? WHERE id = ?`,
      ).run(
        input.title ?? existing.title,
        input.description ?? existing.description,
        input.priority ?? existing.priority,
        input.status ?? existing.status,
        assigneeId,
        dueDate,
        clientId,
        nowIso(),
        id,
      );
      // A same-column reposition can also come through update().
      if (input.columnId !== undefined || input.position !== undefined) {
        return this.move(
          id,
          input.columnId ?? existing.column_id,
          input.position ?? existing.position,
        );
      }
      return toDto(byId.get(id) as TaskRow);
    },
    move(id, targetColumnId, targetPosition) {
      const existing = byId.get(id) as TaskRow | undefined;
      if (!existing) {
        return undefined;
      }
      const sourceColumnId = existing.column_id;
      const tx = db.transaction(() => {
        // Park the task in the target column at a high position, renumber, then
        // splice it into the requested slot.
        db.prepare(`UPDATE tasks SET column_id = ?, position = ?, updated_at = ? WHERE id = ?`).run(
          targetColumnId,
          Number.MAX_SAFE_INTEGER,
          nowIso(),
          id,
        );
        if (sourceColumnId !== targetColumnId) {
          reindex(sourceColumnId);
        }
        const ids = (byColumn.all(targetColumnId) as { id: string }[])
          .map((r) => r.id)
          .filter((tid) => tid !== id);
        const clamped = Math.max(0, Math.min(targetPosition, ids.length));
        ids.splice(clamped, 0, id);
        ids.forEach((tid, index) => setPosition.run(index, tid));
      });
      tx();
      return toDto(byId.get(id) as TaskRow);
    },
    addAttachment(id, input) {
      const existing = byId.get(id) as TaskRow | undefined;
      if (!existing) {
        return undefined;
      }
      const attachments = parseArray<TaskAttachmentDto>(existing.attachments);
      const attachment: TaskAttachmentDto = {
        id: newId('att'),
        name: input.name,
        mimeType: input.mimeType,
        url: input.url,
        sizeBytes: input.sizeBytes,
        createdAt: nowIso(),
      };
      attachments.push(attachment);
      db.prepare(`UPDATE tasks SET attachments = ?, updated_at = ? WHERE id = ?`).run(
        JSON.stringify(attachments),
        nowIso(),
        id,
      );
      return toDto(byId.get(id) as TaskRow);
    },
    removeAttachment(id, attachmentId) {
      const existing = byId.get(id) as TaskRow | undefined;
      if (!existing) {
        return undefined;
      }
      const attachments = parseArray<TaskAttachmentDto>(existing.attachments).filter(
        (a) => a.id !== attachmentId,
      );
      db.prepare(`UPDATE tasks SET attachments = ?, updated_at = ? WHERE id = ?`).run(
        JSON.stringify(attachments),
        nowIso(),
        id,
      );
      return toDto(byId.get(id) as TaskRow);
    },
    remove(id) {
      const existing = byId.get(id) as TaskRow | undefined;
      if (!existing) {
        return false;
      }
      del.run(id);
      reindex(existing.column_id);
      return true;
    },
  };
}
