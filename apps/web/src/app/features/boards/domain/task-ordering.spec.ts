import type { TaskDto } from '@tkf/shared-types';

import { moveTask, tasksInColumn } from './task-ordering';

function task(id: string, columnId: string, position: number): TaskDto {
  return {
    id,
    boardId: 'b1',
    columnId,
    title: id,
    priority: 'medium',
    status: 'backlog',
    position,
    labels: [],
    checklistItems: [],
    attachments: [],
    commentCount: 0,
    attachmentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Compact "id@position" view of a column, ordered, for readable assertions. */
function layout(tasks: ReadonlyArray<TaskDto>, columnId: string): string[] {
  return tasksInColumn(tasks, columnId).map((t) => `${t.id}@${t.position}`);
}

describe('moveTask', () => {
  const seed = (): TaskDto[] => [
    task('a', 'todo', 0),
    task('b', 'todo', 1),
    task('c', 'todo', 2),
    task('x', 'done', 0),
    task('y', 'done', 1),
  ];

  it('reorders within the same column and re-densifies positions', () => {
    const result = moveTask(seed(), 'c', 'todo', 0);
    expect(layout(result, 'todo')).toEqual(['c@0', 'a@1', 'b@2']);
  });

  it('moves a task to another column at the requested position', () => {
    const result = moveTask(seed(), 'a', 'done', 1);
    expect(layout(result, 'done')).toEqual(['x@0', 'a@1', 'y@2']);
    expect(layout(result, 'todo')).toEqual(['b@0', 'c@1']);
  });

  it('appends to the end of the target column', () => {
    const result = moveTask(seed(), 'b', 'done', 2);
    expect(layout(result, 'done')).toEqual(['x@0', 'y@1', 'b@2']);
  });

  it('moves into an empty column', () => {
    const result = moveTask(seed(), 'b', 'review', 0);
    expect(layout(result, 'review')).toEqual(['b@0']);
    expect(layout(result, 'todo')).toEqual(['a@0', 'c@1']);
  });

  it('is a no-op for an unknown task id', () => {
    const input = seed();
    const result = moveTask(input, 'missing', 'done', 0);
    expect(result).toBe(input);
  });

  it('does not mutate the input array or its tasks', () => {
    const input = seed();
    const snapshot = JSON.stringify(input);
    moveTask(input, 'a', 'done', 0);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('keeps every column contiguously indexed from zero', () => {
    const result = moveTask(seed(), 'a', 'done', 0);
    for (const columnId of ['todo', 'done']) {
      const positions = tasksInColumn(result, columnId).map((t) => t.position);
      expect(positions).toEqual(positions.map((_, i) => i));
    }
  });

  it('clamps a target position beyond the column length to the end', () => {
    const result = moveTask(seed(), 'a', 'done', 99);
    // 'a' asked for slot 99 but the column only has room for index 2.
    expect(layout(result, 'done')).toEqual(['x@0', 'y@1', 'a@2']);
    expect(layout(result, 'todo')).toEqual(['b@0', 'c@1']);
  });

  it('moves a task down within the same column and re-densifies', () => {
    // 'a'@0 requests slot 2; 'c'@2 shifts up, so densifying yields b, a, c.
    const result = moveTask(seed(), 'a', 'todo', 2);
    expect(layout(result, 'todo')).toEqual(['b@0', 'a@1', 'c@2']);
  });

  it('keeps columns contiguous 0..n-1 across chained moves', () => {
    let result: ReadonlyArray<TaskDto> = seed();
    result = moveTask(result, 'a', 'done', 0);
    result = moveTask(result, 'y', 'todo', 1);
    result = moveTask(result, 'c', 'done', 0);
    for (const columnId of ['todo', 'done']) {
      const positions = tasksInColumn(result, columnId).map((t) => t.position);
      expect(positions).toEqual(positions.map((_, i) => i));
    }
    // Every task still lives in exactly one column with a unique slot.
    expect(layout(result, 'todo').length + layout(result, 'done').length).toBe(5);
  });
});

describe('tasksInColumn', () => {
  const seed = (): TaskDto[] => [
    task('a', 'todo', 2),
    task('b', 'todo', 0),
    task('c', 'todo', 1),
    task('x', 'done', 0),
  ];

  it('returns tasks of a column ordered by position', () => {
    expect(layout(seed(), 'todo')).toEqual(['b@0', 'c@1', 'a@2']);
  });

  it('returns an empty array for an unknown column id', () => {
    expect(tasksInColumn(seed(), 'nope')).toEqual([]);
  });

  it('preserves insertion order for tasks that share an equal position (stable sort)', () => {
    const tied: TaskDto[] = [
      task('first', 'todo', 0),
      task('second', 'todo', 0),
      task('third', 'todo', 0),
    ];
    expect(tasksInColumn(tied, 'todo').map((t) => t.id)).toEqual(['first', 'second', 'third']);
  });
});
