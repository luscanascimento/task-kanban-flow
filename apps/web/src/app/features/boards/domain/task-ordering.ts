import type { TaskDto } from '@tkf/shared-types';

/** Strips top-level `readonly` so we can build a mutable working copy. */
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position;

/** Return the tasks of one column, ordered by position. */
export function tasksInColumn(
  tasks: ReadonlyArray<TaskDto>,
  columnId: string,
): ReadonlyArray<TaskDto> {
  return tasks.filter((t) => t.columnId === columnId).sort(byPosition);
}

/** Re-densify positions to 0..n-1 for the tasks of one column, in place. */
function reindexColumn(tasks: Array<Mutable<TaskDto>>, columnId: string): void {
  tasks
    .filter((t) => t.columnId === columnId)
    .sort(byPosition)
    .forEach((t, index) => {
      t.position = index;
    });
}

/**
 * Pure kanban move: place `taskId` into `targetColumnId` at `targetPosition`,
 * shifting siblings and re-densifying both the source and target columns.
 * Returns a new array (inputs are not mutated); unknown ids are a no-op.
 *
 * This is the single source of truth for reordering — the store applies it
 * optimistically and the mock backend mirrors it, so the UI and server agree.
 */
export function moveTask(
  tasks: ReadonlyArray<TaskDto>,
  taskId: string,
  targetColumnId: string,
  targetPosition: number,
): ReadonlyArray<TaskDto> {
  const draft: Array<Mutable<TaskDto>> = tasks.map((t) => ({ ...t }));
  const task = draft.find((t) => t.id === taskId);
  if (!task) return tasks;

  const sourceColumnId = task.columnId;
  task.columnId = targetColumnId;

  // Make room in the target column for the incoming task.
  draft
    .filter((t) => t.id !== taskId && t.columnId === targetColumnId && t.position >= targetPosition)
    .forEach((t) => {
      t.position += 1;
    });
  task.position = targetPosition;

  reindexColumn(draft, targetColumnId);
  if (sourceColumnId !== targetColumnId) reindexColumn(draft, sourceColumnId);

  return draft;
}
