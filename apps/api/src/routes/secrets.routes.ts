import type { App } from '../types.js';
import { Type } from '@sinclair/typebox';
import { newId } from '../db/client.js';
import { notFound } from '../http/errors.js';
import { requireBoard, requireSecret } from '../http/access.js';

/**
 * Secrets are board-scoped credentials. The API exposes ONLY metadata — the
 * credential value is AES-256-GCM encrypted at rest and is never returned over
 * HTTP, on any endpoint or scope.
 */
const authType = Type.Union([
  Type.Literal('password'),
  Type.Literal('api_key'),
  Type.Literal('oauth'),
  Type.Literal('access_token'),
  Type.Literal('ssh_key'),
  Type.Literal('other'),
]);
const idParam = Type.Object({ id: Type.String() });
const boardIdParam = Type.Object({ boardId: Type.String() });

export function registerSecretRoutes(app: App): void {
  app.addHook('preHandler', app.requirePrincipal);
  const write = { preHandler: app.requireWrite };

  app.get('/boards/:boardId/secrets', { schema: { params: boardIdParam } }, async (request) => {
    requireBoard(app, request, request.params.boardId);
    return { items: app.repos.secrets.listByBoard(request.params.boardId) };
  });

  app.post(
    '/boards/:boardId/secrets',
    {
      ...write,
      schema: {
        params: boardIdParam,
        body: Type.Object(
          {
            platform: Type.String({ minLength: 1, maxLength: 120 }),
            label: Type.String({ minLength: 1, maxLength: 120 }),
            authType,
            secret: Type.String({ minLength: 1, maxLength: 20_000 }),
            username: Type.Optional(Type.String({ maxLength: 200 })),
            url: Type.Optional(Type.String({ maxLength: 2000 })),
            notes: Type.Optional(Type.String({ maxLength: 2000 })),
            clientId: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      requireBoard(app, request, request.params.boardId);
      const secret = app.repos.secrets.create(newId('sec'), {
        boardId: request.params.boardId,
        ...request.body,
      });
      reply.status(201).send(secret);
    },
  );

  app.patch(
    '/secrets/:id',
    {
      ...write,
      schema: {
        params: idParam,
        body: Type.Object(
          {
            platform: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
            label: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
            authType: Type.Optional(authType),
            secret: Type.Optional(Type.String({ minLength: 1, maxLength: 20_000 })),
            username: Type.Optional(Type.String({ maxLength: 200 })),
            url: Type.Optional(Type.String({ maxLength: 2000 })),
            notes: Type.Optional(Type.String({ maxLength: 2000 })),
            clientId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request) => {
      requireSecret(app, request, request.params.id);
      const secret = app.repos.secrets.update(request.params.id, request.body);
      if (!secret) {
        throw notFound('Secret not found');
      }
      return secret;
    },
  );

  app.delete('/secrets/:id', { ...write, schema: { params: idParam } }, async (request, reply) => {
    requireSecret(app, request, request.params.id);
    if (!app.repos.secrets.remove(request.params.id)) {
      throw notFound('Secret not found');
    }
    reply.status(204).send();
  });
}
