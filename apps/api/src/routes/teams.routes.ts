import type { App } from '../types.js';
import { Type } from '@sinclair/typebox';
import type { TeamRole } from '@tkf/shared-types';
import { newId } from '../db/client.js';
import { badRequest, notFound } from '../http/errors.js';
import { getPrincipal } from '../http/principal.js';
import { requireTeamRole } from '../http/access.js';

const idParam = Type.Object({ id: Type.String() });
const role = Type.Union([Type.Literal('owner'), Type.Literal('admin'), Type.Literal('member')]);

/** Roles allowed to administer a team (rename, membership). Deletion is owner-only. */
const MANAGERS = ['owner', 'admin'] as const;

export function registerTeamRoutes(app: App): void {
  app.addHook('preHandler', app.requirePrincipal);
  const write = { preHandler: app.requireWrite };

  app.get('/', async (request) => ({
    items: app.repos.teams.list(getPrincipal(request).userId),
  }));

  app.get('/:id', { schema: { params: idParam } }, async (request) => {
    const team = app.repos.teams.get(getPrincipal(request).userId, request.params.id);
    if (!team) {
      throw notFound('Team not found');
    }
    return team;
  });

  app.get('/:id/boards', { schema: { params: idParam } }, async (request) => {
    const userId = getPrincipal(request).userId;
    if (!app.repos.teams.get(userId, request.params.id)) {
      throw notFound('Team not found');
    }
    return { items: app.repos.boards.list(userId, request.params.id) };
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
      requireTeamRole(app, request, request.params.id, MANAGERS);
      const team = app.repos.teams.update(request.params.id, request.body);
      if (!team) {
        throw notFound('Team not found');
      }
      return team;
    },
  );

  app.delete('/:id', { ...write, schema: { params: idParam } }, async (request, reply) => {
    requireTeamRole(app, request, request.params.id, ['owner']);
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
      const userId = getPrincipal(request).userId;
      requireTeamRole(app, request, request.params.id, MANAGERS);
      const user = app.repos.users.findByEmail(request.body.email);
      if (!user) {
        throw badRequest('No user with that email', 'unknown_user');
      }
      app.repos.teams.addMember(request.params.id, user.dto.id, request.body.role as TeamRole);
      return app.repos.teams.get(userId, request.params.id);
    },
  );

  app.patch(
    '/:id/members/:userId',
    {
      ...write,
      schema: {
        params: Type.Object({ id: Type.String(), userId: Type.String() }),
        body: Type.Object({ role }, { additionalProperties: false }),
      },
    },
    async (request) => {
      const userId = getPrincipal(request).userId;
      requireTeamRole(app, request, request.params.id, MANAGERS);
      const team = app.repos.teams.get(userId, request.params.id);
      if (!team || !team.members.some((m) => m.user.id === request.params.userId)) {
        throw notFound('Team member not found');
      }
      app.repos.teams.addMember(
        request.params.id,
        request.params.userId,
        request.body.role as TeamRole,
      );
      return app.repos.teams.get(userId, request.params.id);
    },
  );

  app.delete(
    '/:id/members/:userId',
    { ...write, schema: { params: Type.Object({ id: Type.String(), userId: Type.String() }) } },
    async (request, reply) => {
      requireTeamRole(app, request, request.params.id, MANAGERS);
      if (!app.repos.teams.removeMember(request.params.id, request.params.userId)) {
        throw notFound('Team member not found');
      }
      reply.status(204).send();
    },
  );
}
