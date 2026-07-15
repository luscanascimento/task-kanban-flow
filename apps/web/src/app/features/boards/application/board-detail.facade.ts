import { Injectable, inject } from '@angular/core';

import type {
  AddTaskAttachmentRequestDto,
  CreateColumnRequestDto,
  CreateTaskRequestDto,
  UpdateColumnRequestDto,
  UpdateTaskRequestDto,
} from '@tkf/shared-types';

import { CLIENT_REPOSITORY } from '../../clients/domain/client.repository';
import { BOARD_REPOSITORY } from '../domain/board.repository';
import { COLUMN_REPOSITORY } from '../domain/column.repository';
import { TASK_REPOSITORY } from '../domain/task.repository';
import { BoardDetailStore } from '../presentation/board-detail-store';

/**
 * Application-layer orchestrator for a single board. Coordinates three
 * ports (board / column / task) with the presentation store, and owns the
 * optimistic-update strategy for drag-and-drop moves.
 */
@Injectable()
export class BoardDetailFacade {
  private readonly boards = inject(BOARD_REPOSITORY);
  private readonly columns = inject(COLUMN_REPOSITORY);
  private readonly tasks = inject(TASK_REPOSITORY);
  private readonly clientsRepo = inject(CLIENT_REPOSITORY);
  private readonly store = inject(BoardDetailStore);

  readonly board = this.store.board;
  readonly allTasks = this.store.tasks;
  readonly columnsWithTasks = this.store.columnsWithTasks;
  readonly orderedColumns = this.store.orderedColumns;
  readonly clients = this.store.clients;
  readonly boardClient = this.store.boardClient;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;
  readonly taskCount = this.store.taskCount;

  /** Load the board with its columns, tasks and the client picker list. */
  async load(boardId: string): Promise<void> {
    try {
      this.store.setLoading(true);
      this.store.setError(null);
      const [board, columns, tasks, clients] = await Promise.all([
        this.boards.getById(boardId),
        this.columns.listByBoard(boardId),
        this.tasks.listByBoard(boardId),
        this.clientsRepo.list(),
      ]);
      this.store.setBoard(board);
      this.store.setColumns(columns);
      this.store.setTasks(tasks);
      this.store.setClients(clients);
      this.store.setLoading(false);
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to load board.'));
    }
  }

  /** Assign (or clear, with null) the client this board is for. */
  async setBoardClient(boardId: string, clientId: string | null): Promise<void> {
    const board = await this.boards.update(boardId, { clientId });
    this.store.setBoard(board);
  }

  // --- Tasks ---------------------------------------------------------------
  async createTask(payload: CreateTaskRequestDto): Promise<void> {
    const task = await this.tasks.create(payload);
    this.store.upsertTask(task);
  }

  async updateTask(id: string, payload: UpdateTaskRequestDto): Promise<void> {
    const task = await this.tasks.update(id, payload);
    this.store.upsertTask(task);
  }

  async deleteTask(id: string): Promise<void> {
    const snapshot = this.store.tasks();
    this.store.removeTask(id);
    try {
      await this.tasks.remove(id);
    } catch (e) {
      this.store.restoreTasks(snapshot);
      this.store.setError(toMessage(e, 'Failed to delete task.'));
    }
  }

  async addAttachment(taskId: string, payload: AddTaskAttachmentRequestDto): Promise<void> {
    try {
      this.store.upsertTask(await this.tasks.addAttachment(taskId, payload));
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to attach file.'));
    }
  }

  async removeAttachment(taskId: string, attachmentId: string): Promise<void> {
    this.store.upsertTask(await this.tasks.removeAttachment(taskId, attachmentId));
  }

  /**
   * Move a task via drag-and-drop. The store updates optimistically for an
   * instant UI response; if the server rejects the move we roll back.
   */
  async moveTask(taskId: string, targetColumnId: string, targetPosition: number): Promise<void> {
    const snapshot = this.store.applyMove(taskId, targetColumnId, targetPosition);
    try {
      const persisted = await this.tasks.move(taskId, { targetColumnId, targetPosition });
      this.store.upsertTask(persisted);
    } catch (e) {
      this.store.restoreTasks(snapshot);
      this.store.setError(toMessage(e, 'Failed to move task.'));
    }
  }

  // --- Columns -------------------------------------------------------------
  async createColumn(payload: CreateColumnRequestDto): Promise<void> {
    const column = await this.columns.create(payload);
    this.store.upsertColumn(column);
  }

  async updateColumn(id: string, payload: UpdateColumnRequestDto): Promise<void> {
    const column = await this.columns.update(id, payload);
    this.store.upsertColumn(column);
  }

  async deleteColumn(id: string): Promise<void> {
    // Snapshot both columns and tasks: removeColumn also drops the column's
    // tasks, so a failed delete must restore the full slice.
    const columnsSnapshot = this.store.columns();
    const tasksSnapshot = this.store.tasks();
    this.store.removeColumn(id);
    try {
      await this.columns.remove(id);
    } catch (e) {
      this.store.restoreColumns(columnsSnapshot);
      this.store.restoreTasks(tasksSnapshot);
      this.store.setError(toMessage(e, 'Failed to delete column.'));
    }
  }

  addColumn(boardId: string, title: string): Promise<void> {
    const position = this.orderedColumns().length;
    return this.createColumn({ boardId, title, position });
  }
}

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
