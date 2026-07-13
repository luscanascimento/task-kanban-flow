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
});
