import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { BoardDto, ClientDto, ColumnDto, TaskDto } from '@tkf/shared-types';

import { moveTask } from '../domain/task-ordering';

/** A column paired with its ordered tasks — the unit the board renders. */
export interface ColumnWithTasks {
  readonly column: ColumnDto;
  readonly tasks: ReadonlyArray<TaskDto>;
  readonly isOverWipLimit: boolean;
}

interface BoardDetailState {
  board: BoardDto | null;
  columns: ReadonlyArray<ColumnDto>;
  tasks: ReadonlyArray<TaskDto>;
  /** All clients, for the board/task client pickers. */
  clients: ReadonlyArray<ClientDto>;
  isLoading: boolean;
  error: string | null;
}

const initialState: BoardDetailState = {
  board: null,
  columns: [],
  tasks: [],
  clients: [],
  isLoading: false,
  error: null,
};

const byPosition = <T extends { position: number }>(a: T, b: T): number => a.position - b.position;

/**
 * Feature-scoped store for a single board view. Owns the board's columns
 * and tasks and exposes them grouped for rendering. `applyMove` performs
 * the drag-and-drop reordering optimistically so the UI updates instantly;
 * the facade reconciles with the server and rolls back on failure.
 */
export const BoardDetailStore = signalStore(
  withState(initialState),
  withComputed(({ board, columns, tasks, clients }) => ({
    orderedColumns: computed(() => [...columns()].sort(byPosition)),
    boardClient: computed(() => {
      const id = board()?.clientId;
      return id ? (clients().find((c) => c.id === id) ?? null) : null;
    }),
    columnsWithTasks: computed<ReadonlyArray<ColumnWithTasks>>(() => {
      const allTasks = tasks();
      return [...columns()].sort(byPosition).map((column) => {
        const columnTasks = allTasks.filter((t) => t.columnId === column.id).sort(byPosition);
        return {
          column,
          tasks: columnTasks,
          isOverWipLimit: column.wipLimit !== undefined && columnTasks.length > column.wipLimit,
        };
      });
    }),
    taskCount: computed(() => tasks().length),
    isEmpty: computed(() => board() !== null && columns().length === 0),
  })),
  withMethods((store) => ({
    setBoard(board: BoardDto): void {
      patchState(store, { board });
    },
    setColumns(columns: ReadonlyArray<ColumnDto>): void {
      patchState(store, { columns });
    },
    setTasks(tasks: ReadonlyArray<TaskDto>): void {
      patchState(store, { tasks });
    },
    setClients(clients: ReadonlyArray<ClientDto>): void {
      patchState(store, { clients });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
    upsertColumn(column: ColumnDto): void {
      const exists = store.columns().some((c) => c.id === column.id);
      const columns = exists
        ? store.columns().map((c) => (c.id === column.id ? column : c))
        : [...store.columns(), column];
      patchState(store, { columns });
    },
    removeColumn(id: string): void {
      patchState(store, {
        columns: store.columns().filter((c) => c.id !== id),
        tasks: store.tasks().filter((t) => t.columnId !== id),
      });
    },
    upsertTask(task: TaskDto): void {
      const exists = store.tasks().some((t) => t.id === task.id);
      const tasks = exists
        ? store.tasks().map((t) => (t.id === task.id ? task : t))
        : [...store.tasks(), task];
      patchState(store, { tasks });
    },
    removeTask(id: string): void {
      patchState(store, { tasks: store.tasks().filter((t) => t.id !== id) });
    },
    /**
     * Optimistically move a task to `targetColumnId` at `targetPosition`,
     * re-densifying both the source and target columns. Returns a snapshot
     * of the previous tasks so the facade can roll back on error.
     */
    applyMove(
      taskId: string,
      targetColumnId: string,
      targetPosition: number,
    ): ReadonlyArray<TaskDto> {
      const snapshot = store.tasks();
      patchState(store, { tasks: moveTask(snapshot, taskId, targetColumnId, targetPosition) });
      return snapshot;
    },
    restoreTasks(tasks: ReadonlyArray<TaskDto>): void {
      patchState(store, { tasks });
    },
  })),
);
