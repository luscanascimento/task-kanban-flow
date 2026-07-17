import Fastify, { type FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { loadEnv, type Env } from './env.js';
import { openDb, type Db } from './db/client.js';
import { createRepositories } from './repositories/index.js';
import { registerSecurity } from './plugins/security.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './http/error-handler.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerApiKeyRoutes } from './routes/api-keys.routes.js';
import { registerBoardRoutes, registerTaskRoutes } from './routes/kanban.routes.js';
import { registerClientRoutes } from './routes/clients.routes.js';
import { registerTeamRoutes } from './routes/teams.routes.js';
import { registerSecretRoutes } from './routes/secrets.routes.js';
import './types.js';

export interface BuildOptions {
  env?: Env;
  db?: Db;
}

/**
 * Build a fully-wired Fastify instance. Tests pass an in-memory db + test env;
 * production reads from the environment.
 */
export async function buildApp(options: BuildOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnv();
  const db = options.db ?? openDb(env.databasePath);

  const app = Fastify({
    logger: env.nodeEnv === 'test' ? false : { level: env.isProd ? 'info' : 'debug' },
    trustProxy: env.isProd,
    bodyLimit: 6 * 1024 * 1024, // 6 MiB — accommodates data-URL attachments
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.decorate('env', env);
  app.decorate('db', db);
  app.decorate('repos', createRepositories(db, env.secretsEncKey));

  await registerSecurity(app, env);
  registerAuth(app);
  registerErrorHandler(app);

  // Liveness — no auth, no rate accounting surprises.
  app.get(
    '/api/v1/health',
    { schema: { response: { 200: Type.Object({ status: Type.String(), time: Type.String() }) } } },
    async () => ({ status: 'ok', time: new Date().toISOString() }),
  );

  await app.register(registerAuthRoutes, { prefix: '/api/v1/auth' });
  await app.register(registerApiKeyRoutes, { prefix: '/api/v1/keys' });
  await app.register(registerBoardRoutes, { prefix: '/api/v1/boards' });
  await app.register(registerTaskRoutes, { prefix: '/api/v1/tasks' });
  await app.register(registerClientRoutes, { prefix: '/api/v1/clients' });
  await app.register(registerTeamRoutes, { prefix: '/api/v1/teams' });
  await app.register(registerSecretRoutes, { prefix: '/api/v1' });

  app.addHook('onClose', async () => {
    db.close();
  });

  return app;
}
