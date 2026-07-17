import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ApiErrorDto } from '@tkf/shared-types';
import { ApiError } from './errors.js';

/**
 * Central error handler. Produces a consistent ApiErrorDto and, crucially,
 * never leaks internal error messages or stack traces to clients for 5xx —
 * those are logged server-side and returned as a generic message.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    send(reply, request, 404, 'not_found', `Route ${request.method} ${request.url} not found`);
  });

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Schema validation failures → 400 with field-level details.
    if (error.validation) {
      const details = error.validation.map((v) => ({
        field: (v.instancePath || v.params?.['missingProperty'] || '')
          .toString()
          .replace(/^\//, ''),
        message: v.message ?? 'Invalid value',
      }));
      const dto: ApiErrorDto = {
        statusCode: 400,
        code: 'validation_error',
        message: 'Request validation failed',
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
      reply.status(400).send(dto);
      return;
    }

    if (error instanceof ApiError) {
      send(reply, request, error.statusCode, error.code, error.message);
      return;
    }

    // Rate-limit plugin sets statusCode 429.
    if (error.statusCode === 429) {
      send(reply, request, 429, 'rate_limited', 'Too many requests, please slow down');
      return;
    }

    if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      send(reply, request, error.statusCode, error.code ?? 'error', error.message);
      return;
    }

    request.log.error({ err: error }, 'Unhandled error');
    send(reply, request, 500, 'internal_error', 'An unexpected error occurred');
  });
}

function send(
  reply: FastifyReply,
  request: FastifyRequest,
  statusCode: number,
  code: string,
  message: string,
): void {
  const dto: ApiErrorDto = {
    statusCode,
    code,
    message,
    timestamp: new Date().toISOString(),
    path: request.url,
  };
  reply.status(statusCode).send(dto);
}
