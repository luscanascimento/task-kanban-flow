import type { App } from '../types.js';
import { Type } from '@sinclair/typebox';
import { newId } from '../db/client.js';
import { notFound } from '../http/errors.js';

const idParam = Type.Object({ id: Type.String() });
const optStr = (max: number) => Type.Optional(Type.String({ maxLength: max }));

export function registerClientRoutes(app: App): void {
  app.addHook('preHandler', app.requirePrincipal);
  const write = { preHandler: app.requireWrite };

  app.get('/', async () => ({ items: app.repos.clients.list() }));

  app.get('/:id', { schema: { params: idParam } }, async (request) => {
    const client = app.repos.clients.get(request.params.id);
    if (!client) {
      throw notFound('Client not found');
    }
    return client;
  });

  app.get('/:id/boards', { schema: { params: idParam } }, async (request) => {
    if (!app.repos.clients.get(request.params.id)) {
      throw notFound('Client not found');
    }
    const boards = app.repos.boards.list().filter((b) => b.clientId === request.params.id);
    return { items: boards };
  });

  const bodySchema = Type.Object(
    {
      name: Type.String({ minLength: 1, maxLength: 160 }),
      company: optStr(160),
      email: Type.Optional(Type.String({ format: 'email', maxLength: 254 })),
      phone: optStr(40),
      notes: optStr(2000),
      color: optStr(40),
    },
    { additionalProperties: false },
  );

  app.post('/', { ...write, schema: { body: bodySchema } }, async (request, reply) => {
    reply.status(201).send(app.repos.clients.create(newId('cli'), request.body));
  });

  app.patch(
    '/:id',
    { ...write, schema: { params: idParam, body: Type.Partial(bodySchema) } },
    async (request) => {
      const client = app.repos.clients.update(request.params.id, request.body);
      if (!client) {
        throw notFound('Client not found');
      }
      return client;
    },
  );

  app.delete('/:id', { ...write, schema: { params: idParam } }, async (request, reply) => {
    if (!app.repos.clients.remove(request.params.id)) {
      throw notFound('Client not found');
    }
    reply.status(204).send();
  });
}
