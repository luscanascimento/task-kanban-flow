import type { App } from '../types.js';
import { Type } from '@sinclair/typebox';
import { newId } from '../db/client.js';
import { notFound } from '../http/errors.js';
import { getPrincipal } from '../http/principal.js';
import { requireBoard, requireColumn, requireTask, requireTeamRole } from '../http/access.js';

const priority = Type.Union([
  Type.Literal('lowest'),
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
  Type.Literal('urgent'),
]);
const status = Type.Union([
  Type.Literal('backlog'),
  Type.Literal('in_progress'),
  Type.Literal('blocked'),
  Type.Literal('done'),
  Type.Literal('cancelled'),
]);
const visibility = Type.Union([
  Type.Literal('private'),
  Type.Literal('workspace'),
  Type.Literal('public'),
]);
const idParam = Type.Object({ id: Type.String() });
const boardIdParam = Type.Object({ boardId: Type.String() });
const str = (max: number) => Type.String({ minLength: 1, maxLength: max });

export function registerBoardRoutes(app: App): void {
  app.addHook('preHandler', app.requirePrincipal);
  const write = { preHandler: app.requireWrite };

  app.get(
    '/',
    { schema: { querystring: Type.Object({ teamId: Type.Optional(Type.String()) }) } },
    async (request) => ({
      items: app.repos.boards.list(getPrincipal(request).userId, request.query.teamId),
    }),
  );

  app.get('/:boardId', { schema: { params: boardIdParam } }, async (request) => {
    const board = app.repos.boards.get(getPrincipal(request).userId, request.params.boardId);
    if (!board) {
      throw notFound('Board not found');
    }
    return board;
  });

  app.post(
    '/',
    {
      ...write,
      schema: {
        body: Type.Object(
          {
            teamId: Type.String(),
            title: str(160),
            description: Type.Optional(Type.String({ maxLength: 2000 })),
            visibility: Type.Optional(visibility),
            clientId: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const b = request.body;
      // Any member of the team may open a board in it.
      requireTeamRole(app, request, b.teamId, ['owner', 'admin', 'member']);
      const board = app.repos.boards.create(newId('brd'), getPrincipal(request).userId, {
        teamId: b.teamId,
        title: b.title,
        ...(b.description === undefined ? {} : { description: b.description }),
        visibility: b.visibility ?? 'workspace',
        ...(b.clientId === undefined ? {} : { clientId: b.clientId }),
      });
      reply.status(201).send(board);
    },
  );

  app.patch(
    '/:boardId',
    {
      ...write,
      schema: {
        params: boardIdParam,
        body: Type.Object(
          {
            title: Type.Optional(str(160)),
            description: Type.Optional(Type.String({ maxLength: 2000 })),
            visibility: Type.Optional(visibility),
            clientId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request) => {
      const board = app.repos.boards.update(
        getPrincipal(request).userId,
        request.params.boardId,
        request.body,
      );
      if (!board) {
        throw notFound('Board not found');
      }
      return board;
    },
  );

  app.delete(
    '/:boardId',
    { ...write, schema: { params: boardIdParam } },
    async (request, reply) => {
      if (!app.repos.boards.remove(getPrincipal(request).userId, request.params.boardId)) {
        throw notFound('Board not found');
      }
      reply.status(204).send();
    },
  );

  // Columns (nested under a board).
  app.get('/:boardId/columns', { schema: { params: boardIdParam } }, async (request) => {
    requireBoard(app, request, request.params.boardId);
    return { items: app.repos.columns.listByBoard(request.params.boardId) };
  });

  app.post(
    '/:boardId/columns',
    {
      ...write,
      schema: {
        params: boardIdParam,
        body: Type.Object(
          {
            title: str(120),
            position: Type.Integer({ minimum: 0 }),
            color: Type.Optional(Type.String({ maxLength: 40 })),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const b = request.body;
      requireBoard(app, request, request.params.boardId);
      const column = app.repos.columns.create(newId('col'), {
        boardId: request.params.boardId,
        title: b.title,
        position: b.position,
        ...(b.color === undefined ? {} : { color: b.color }),
      });
      reply.status(201).send(column);
    },
  );

  app.post(
    '/:boardId/columns/reorder',
    {
      ...write,
      schema: {
        params: boardIdParam,
        // Accept either `orderedIds` (canonical) or `orderedColumnIds` (the web
        // app's key) so both the API contract and the app work unchanged.
        body: Type.Object(
          {
            orderedIds: Type.Optional(Type.Array(Type.String())),
            orderedColumnIds: Type.Optional(Type.Array(Type.String())),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request) => {
      const boardId = request.params.boardId;
      requireBoard(app, request, boardId);
      const ordered = request.body.orderedIds ?? request.body.orderedColumnIds ?? [];
      for (const id of ordered) {
        if (requireColumn(app, request, id).boardId !== boardId) {
          throw notFound('Column not found');
        }
      }
      return { items: app.repos.columns.reorder(boardId, ordered) };
    },
  );

  // Tasks (nested under a board).
  app.get('/:boardId/tasks', { schema: { params: boardIdParam } }, async (request) => {
    requireBoard(app, request, request.params.boardId);
    return { items: app.repos.tasks.listByBoard(request.params.boardId) };
  });

  app.post(
    '/:boardId/tasks',
    {
      ...write,
      schema: {
        params: boardIdParam,
        body: Type.Object(
          {
            columnId: Type.String(),
            title: str(240),
            priority: Type.Optional(priority),
            assigneeId: Type.Optional(Type.String()),
            dueDate: Type.Optional(Type.String()),
            clientId: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const b = request.body;
      requireBoard(app, request, request.params.boardId);
      if (requireColumn(app, request, b.columnId).boardId !== request.params.boardId) {
        throw notFound('Column not found');
      }
      const task = app.repos.tasks.create(newId('tsk'), {
        boardId: request.params.boardId,
        columnId: b.columnId,
        title: b.title,
        priority: b.priority ?? 'medium',
        ...(b.assigneeId === undefined ? {} : { assigneeId: b.assigneeId }),
        ...(b.dueDate === undefined ? {} : { dueDate: b.dueDate }),
        ...(b.clientId === undefined ? {} : { clientId: b.clientId }),
      });
      reply.status(201).send(task);
    },
  );
}

/** Task-scoped routes mounted at /tasks. */
export function registerTaskRoutes(app: App): void {
  app.addHook('preHandler', app.requirePrincipal);
  const write = { preHandler: app.requireWrite };

  app.get('/:id', { schema: { params: idParam } }, async (request) =>
    requireTask(app, request, request.params.id),
  );

  app.patch(
    '/:id',
    {
      ...write,
      schema: {
        params: idParam,
        body: Type.Object(
          {
            title: Type.Optional(str(240)),
            description: Type.Optional(Type.String({ maxLength: 20_000 })),
            priority: Type.Optional(priority),
            status: Type.Optional(status),
            columnId: Type.Optional(Type.String()),
            position: Type.Optional(Type.Integer({ minimum: 0 })),
            assigneeId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            dueDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            clientId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request) => {
      const existing = requireTask(app, request, request.params.id);
      if (
        request.body.columnId !== undefined &&
        requireColumn(app, request, request.body.columnId).boardId !== existing.boardId
      ) {
        throw notFound('Column not found');
      }
      const task = app.repos.tasks.update(request.params.id, request.body);
      if (!task) {
        throw notFound('Task not found');
      }
      return task;
    },
  );

  app.post(
    '/:id/move',
    {
      ...write,
      schema: {
        params: idParam,
        body: Type.Object(
          { targetColumnId: Type.String(), targetPosition: Type.Integer({ minimum: 0 }) },
          { additionalProperties: false },
        ),
      },
    },
    async (request) => {
      const existing = requireTask(app, request, request.params.id);
      if (requireColumn(app, request, request.body.targetColumnId).boardId !== existing.boardId) {
        throw notFound('Column not found');
      }
      const task = app.repos.tasks.move(
        request.params.id,
        request.body.targetColumnId,
        request.body.targetPosition,
      );
      if (!task) {
        throw notFound('Task not found');
      }
      return task;
    },
  );

  app.post(
    '/:id/attachments',
    {
      ...write,
      schema: {
        params: idParam,
        body: Type.Object(
          {
            name: str(255),
            mimeType: str(120),
            url: Type.String({ maxLength: 5_000_000 }),
            sizeBytes: Type.Integer({ minimum: 0, maximum: 5_242_880 }),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      requireTask(app, request, request.params.id);
      const task = app.repos.tasks.addAttachment(request.params.id, request.body);
      if (!task) {
        throw notFound('Task not found');
      }
      reply.status(201).send(task);
    },
  );

  app.delete(
    '/:id/attachments/:attachmentId',
    {
      ...write,
      schema: { params: Type.Object({ id: Type.String(), attachmentId: Type.String() }) },
    },
    async (request) => {
      requireTask(app, request, request.params.id);
      const task = app.repos.tasks.removeAttachment(request.params.id, request.params.attachmentId);
      if (!task) {
        throw notFound('Task not found');
      }
      return task;
    },
  );

  app.delete('/:id', { ...write, schema: { params: idParam } }, async (request, reply) => {
    requireTask(app, request, request.params.id);
    if (!app.repos.tasks.remove(request.params.id)) {
      throw notFound('Task not found');
    }
    reply.status(204).send();
  });
}
