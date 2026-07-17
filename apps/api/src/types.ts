import type {
  FastifyBaseLogger,
  FastifyInstance,
  preHandlerHookHandler,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { Env } from './env.js';
import type { Db } from './db/client.js';
import type { Repositories } from './repositories/index.js';
import type { ApiKeyScope } from './repositories/api-keys.repo.js';

/** The app's Fastify instance type, with the TypeBox provider for schema-typed routes. */
export type App = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

/** The authenticated caller on a request — either an app user or an API key. */
export interface Principal {
  readonly userId: string;
  readonly kind: 'user' | 'api_key';
  readonly scope: ApiKeyScope;
}

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
    db: Db;
    repos: Repositories;
    /** preHandler: require a valid app-user JWT (used for key management). */
    requireUser: preHandlerHookHandler;
    /** preHandler: accept a JWT user OR a valid API key. */
    requirePrincipal: preHandlerHookHandler;
    /** preHandler: require read_write scope (API keys); users always pass. */
    requireWrite: preHandlerHookHandler;
  }
  interface FastifyRequest {
    principal?: Principal;
  }
}
