import type { FastifyRequest } from 'fastify';
import type { Principal } from '../types.js';
import { unauthorized } from './errors.js';

/**
 * Read the authenticated principal set by an auth preHandler. Throws 401 if it
 * is somehow absent (a programming error — the route forgot its guard).
 */
export function getPrincipal(request: FastifyRequest): Principal {
  if (!request.principal) {
    throw unauthorized();
  }
  return request.principal;
}
