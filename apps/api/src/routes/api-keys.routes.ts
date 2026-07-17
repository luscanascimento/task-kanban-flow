import type { App } from '../types.js';
import { Type } from '@sinclair/typebox';
import { generateApiKey } from '../crypto/api-key.js';
import { newId } from '../db/client.js';
import { notFound, unauthorized } from '../http/errors.js';

/**
 * API-key management — always operated by a logged-in app user (never by an
 * API key itself). The plaintext key is returned exactly ONCE on creation;
 * only its keyed hash is stored.
 */
export function registerApiKeyRoutes(app: App): void {
  // Every route here requires a user session.
  app.addHook('preHandler', app.requireUser);

  app.get('/', async (request) => {
    const principal = request.principal;
    if (!principal) {
      throw unauthorized();
    }
    return { items: app.repos.apiKeys.listByUser(principal.userId) };
  });

  app.post(
    '/',
    {
      schema: {
        body: Type.Object(
          {
            name: Type.String({ minLength: 1, maxLength: 80 }),
            scope: Type.Union([Type.Literal('read'), Type.Literal('read_write')], {
              default: 'read',
            }),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const principal = request.principal;
      if (!principal) {
        throw unauthorized();
      }
      const { name, scope } = request.body;
      const generated = generateApiKey(app.env.apiKeyPepper);
      const dto = app.repos.apiKeys.create({
        id: newId('key'),
        userId: principal.userId,
        name,
        keyHash: generated.hash,
        display: generated.display,
        scope,
      });
      // `key` is the ONLY time the plaintext is ever exposed.
      reply.status(201).send({ ...dto, key: generated.plaintext });
    },
  );

  app.delete(
    '/:id',
    { schema: { params: Type.Object({ id: Type.String() }) } },
    async (request, reply) => {
      const principal = request.principal;
      if (!principal) {
        throw unauthorized();
      }
      const revoked = app.repos.apiKeys.revoke(request.params.id, principal.userId);
      if (!revoked) {
        throw notFound('API key not found or already revoked');
      }
      reply.status(204).send();
    },
  );
}
