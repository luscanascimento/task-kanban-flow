import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadEnv } from '../env.js';
import { openDb } from '../db/client.js';

/** A fully-configured test app on an in-memory database. */
export async function buildTestApp(): Promise<FastifyInstance> {
  const env = loadEnv({
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'test-access-secret-value-000000000000',
    JWT_REFRESH_SECRET: 'test-refresh-secret-value-00000000000',
    PASSWORD_PEPPER: 'test-password-pepper',
    APIKEY_PEPPER: 'test-apikey-pepper',
    SECRETS_ENC_KEY: Buffer.alloc(32, 7).toString('base64'),
    RATE_LIMIT_MAX: '100000',
    AUTH_RATE_LIMIT_MAX: '100000',
  });
  const db = openDb(':memory:');
  return buildApp({ env, db });
}

export async function registerUser(
  app: FastifyInstance,
  email = 'user@example.com',
): Promise<{ accessToken: string; userId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: 'password123', displayName: 'Test User' },
  });
  const body = res.json() as { user: { id: string }; tokens: { accessToken: string } };
  return { accessToken: body.tokens.accessToken, userId: body.user.id };
}
