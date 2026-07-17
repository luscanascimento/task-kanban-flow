import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import csrf from '@fastify/csrf-protection';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { ApiErrorDto } from '@tkf/shared-types';
import type { Env } from '../env.js';

/**
 * Registers the security middleware stack:
 *  - Helmet   → hardened response headers + Content-Security-Policy
 *  - CORS     → locked to the configured web origin(s), credentials allowed
 *  - Rate limit → global per-IP cap (auth routes tighten it further)
 *  - Cookie + CSRF → for the httpOnly refresh cookie flow
 *  - Swagger  → OpenAPI document + interactive docs at /docs
 */
export async function registerSecurity(app: FastifyInstance, env: Env): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
  });

  await app.register(cors, {
    origin: [...env.webOrigins],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    maxAge: 86_400,
  });

  await app.register(rateLimit, {
    global: true,
    max: env.rateLimitMax,
    timeWindow: env.rateLimitWindow,
    // Emit our ApiErrorDto shape on 429.
    errorResponseBuilder: (request, context): ApiErrorDto => ({
      statusCode: 429,
      code: 'rate_limited',
      message: `Rate limit exceeded — retry in ${Math.ceil(context.ttl / 1000)}s`,
      timestamp: new Date().toISOString(),
      path: request.url,
    }),
  });

  await app.register(cookie, { secret: env.jwtRefreshSecret });
  await app.register(csrf, {
    cookieOpts: { signed: true, sameSite: 'strict', httpOnly: true, secure: env.cookieSecure },
    getToken: (request) => {
      const header = request.headers['x-csrf-token'];
      return typeof header === 'string' ? header : undefined;
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Task Kanban Flow API',
        description:
          'Public REST API for Task Kanban Flow. Authenticate with a Bearer API key ' +
          '(`Authorization: Bearer tkf_…`). Read keys can GET; read_write keys can mutate.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          apiKey: { type: 'http', scheme: 'bearer', description: 'API key: tkf_…' },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs', staticCSP: true });
}
