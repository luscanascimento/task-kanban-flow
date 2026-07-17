import { Type } from '@sinclair/typebox';
import type { App } from '../types.js';
import { newId } from '../db/client.js';
import { notFound } from '../http/errors.js';

/**
 * Flat column routes mounted at /columns — create/update/delete by id. The
 * nested `POST /boards/:boardId/columns` (in kanban.routes) also exists; this
 * flat surface mirrors the web app's column adapter (boardId in the body).
 */
const idParam = Type.Object({ id: Type.String() });

export function registerColumnRoutes(app: App): void {
  app.addHook('preHandler', app.requirePrincipal);
  const write = { preHandler: app.requireWrite };

  app.post(
    '/',
    {
      ...write,
      schema: {
        body: Type.Object(
          {
            boardId: Type.String(),
            title: Type.String({ minLength: 1, maxLength: 120 }),
            position: Type.Integer({ minimum: 0 }),
            color: Type.Optional(Type.String({ maxLength: 40 })),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const b = request.body;
      const column = app.repos.columns.create(newId('col'), {
        boardId: b.boardId,
        title: b.title,
        position: b.position,
        ...(b.color === undefined ? {} : { color: b.color }),
      });
      reply.status(201).send(column);
    },
  );

  app.patch(
    '/:id',
    {
      ...write,
      schema: {
        params: idParam,
        body: Type.Object(
          {
            title: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
            position: Type.Optional(Type.Integer({ minimum: 0 })),
            color: Type.Optional(Type.String({ maxLength: 40 })),
            wipLimit: Type.Optional(Type.Integer({ minimum: 0 })),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request) => {
      const column = app.repos.columns.update(request.params.id, request.body);
      if (!column) {
        throw notFound('Column not found');
      }
      return column;
    },
  );

  app.delete('/:id', { ...write, schema: { params: idParam } }, async (request, reply) => {
    if (!app.repos.columns.remove(request.params.id)) {
      throw notFound('Column not found');
    }
    reply.status(204).send();
  });
}
