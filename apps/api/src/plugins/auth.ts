import type { FastifyInstance, FastifyRequest } from 'fastify';
import { hashApiKey, looksLikeApiKey } from '../crypto/api-key.js';
import { verifyAccessToken } from '../crypto/tokens.js';
import { forbidden, unauthorized } from '../http/errors.js';
import type { Principal } from '../types.js';

function bearer(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return undefined;
  }
  return header.slice('Bearer '.length).trim();
}

/**
 * Resolve the caller. An API key (`tkf_…`) is hashed and looked up with the
 * validity rule enforced in SQL (exists AND not soft-deleted); a JWT is
 * verified as an app-user access token. Users always carry read_write scope.
 */
async function resolvePrincipal(
  app: FastifyInstance,
  request: FastifyRequest,
  allowApiKey: boolean,
): Promise<Principal> {
  const token = bearer(request);
  if (!token) {
    throw unauthorized();
  }

  if (looksLikeApiKey(token)) {
    if (!allowApiKey) {
      throw unauthorized('This endpoint requires a user session, not an API key', 'user_only');
    }
    const resolved = app.repos.apiKeys.resolveActiveByHash(hashApiKey(token, app.env.apiKeyPepper));
    if (!resolved) {
      throw unauthorized('Invalid or revoked API key', 'invalid_api_key');
    }
    app.repos.apiKeys.touchLastUsed(resolved.id);
    return { userId: resolved.userId, kind: 'api_key', scope: resolved.scope };
  }

  try {
    const claims = await verifyAccessToken(token, app.env.jwtAccessSecret);
    return { userId: claims.sub, kind: 'user', scope: 'read_write' };
  } catch {
    throw unauthorized('Invalid or expired access token', 'invalid_token');
  }
}

export function registerAuth(app: FastifyInstance): void {
  app.decorate('requirePrincipal', async (request) => {
    request.principal = await resolvePrincipal(app, request, true);
  });

  app.decorate('requireUser', async (request) => {
    request.principal = await resolvePrincipal(app, request, false);
  });

  app.decorate('requireWrite', async (request) => {
    // requirePrincipal must have run first in the preHandler chain.
    if (!request.principal) {
      request.principal = await resolvePrincipal(app, request, true);
    }
    if (request.principal.scope !== 'read_write') {
      throw forbidden('This API key is read-only; a read_write key is required');
    }
  });
}
