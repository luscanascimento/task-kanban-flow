import type { App } from '../types.js';
import { Type } from '@sinclair/typebox';
import type { TeamRole } from '@tkf/shared-types';
import { newId } from '../db/client.js';
import { badRequest, notFound } from '../http/errors.js';
import { getPrincipal } from '../http/principal.js';

const idParam = Type.Object({ id: Type.String() });
const role = Type.Union([Type.Literal('owner'), Type.Literal('admin'), Type.Literal('member')]);

export function registerTeamRoutes(app: App): void {
  app.addHook('preHandler', app.requirePrincipal);
  const write = { preHandler: app.requireWrite };

  app.get('/', async () => ({ items: app.repos.teams.list() }));

  app.get('/:id', { schema: { params: idParam } }, async (request) => {
    const team = app.repos.teams.get(request.params.id);
    if (!team) {
      throw notFound('Team not found');
    }
    return team;
  });

  app.get('/:id/boards', { schema: { params: idParam } }, async (request) => {
    if (!app.repos.teams.get(request.params.id)) {
      throw notFound('Team not found');
    }
    return { items: app.repos.boards.list(request.params.id) };
  });

  app.post(
    '/',
    {
      ...write,
      schema: {
        body: Type.Object(
          {
            name: Type.String({ minLength: 1, maxLength: 160 }),
            description: Type.Optional(Type.String({ maxLength: 2000 })),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const team = app.repos.teams.create(newId('tea'), getPrincipal(request).userId, request.body);
      reply.status(201).send(team);
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
            name: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
            description: Type.Optional(Type.String({ maxLength: 2000 })),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request) => {
      const team = app.repos.teams.update(request.params.id, request.body);
      if (!team) {
        throw notFound('Team not found');
      }
      return team;
    },
  );

  app.delete('/:id', { ...write, schema: { params: idParam } }, async (request, reply) => {
    if (!app.repos.teams.remove(request.params.id)) {
      throw notFound('Team not found');
    }
    reply.status(204).send();
  });

  app.post(
    '/:id/members',
    {
      ...write,
      schema: {
        params: idParam,
        body: Type.Object(
          { email: Type.String({ format: 'email', maxLength: 254 }), role },
          { additionalProperties: false },
        ),
      },
    },
    async (request) => {
      const team = app.repos.teams.get(request.params.id);
      if (!team) {
        throw notFound('Team not found');
      }
      const user = app.repos.users.findByEmail(request.body.email);
      if (!user) {
        throw badRequest('No user with that email', 'unknown_user');
      }
      app.repos.teams.addMember(request.params.id, user.dto.id, request.body.role as TeamRole);
      return app.repos.teams.get(request.params.id);
    },
  );

  app.delete(
    '/:id/members/:userId',
    { ...write, schema: { params: Type.Object({ id: Type.String(), userId: Type.String() }) } },
    async (request, reply) => {
      if (!app.repos.teams.removeMember(request.params.id, request.params.userId)) {
        throw notFound('Team member not found');
      }
      reply.status(204).send();
    },
  );
}
