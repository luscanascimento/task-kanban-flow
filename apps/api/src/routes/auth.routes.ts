import type { FastifyReply } from 'fastify';
import type { App } from '../types.js';
import { Type } from '@sinclair/typebox';
import type { LoginResponseDto, UserDto } from '@tkf/shared-types';
import { hashPassword, verifyPassword } from '../crypto/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../crypto/tokens.js';
import { newId } from '../db/client.js';
import { badRequest, conflict, unauthorized } from '../http/errors.js';

const REFRESH_COOKIE = 'tkf_refresh';

const emailSchema = Type.String({ format: 'email', maxLength: 254 });
const passwordSchema = Type.String({ minLength: 8, maxLength: 200 });

export function registerAuthRoutes(app: App): void {
  async function issueSession(reply: FastifyReply, user: UserDto): Promise<LoginResponseDto> {
    const { env, repos } = app;
    const jti = newId('rt');
    const accessToken = await signAccessToken(
      { sub: user.id, email: user.email },
      env.jwtAccessSecret,
      env.accessTokenTtl,
    );
    const refreshToken = await signRefreshToken(
      { sub: user.id, jti },
      env.jwtRefreshSecret,
      env.refreshTokenTtl,
    );
    const now = Date.now();
    const refreshExpiresAt = new Date(now + env.refreshTokenTtl * 1000).toISOString();
    repos.refreshTokens.issue({ id: jti, userId: user.id, expiresAt: refreshExpiresAt });

    reply.setCookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.cookieSecure,
      path: '/api/v1/auth',
      maxAge: env.refreshTokenTtl,
      signed: true,
    });

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresAt: new Date(now + env.accessTokenTtl * 1000).toISOString(),
        refreshTokenExpiresAt: refreshExpiresAt,
      },
    };
  }

  // Register — stricter rate limit to blunt credential-stuffing / abuse.
  app.post(
    '/register',
    {
      config: { rateLimit: { max: app.env.authRateLimitMax, timeWindow: app.env.rateLimitWindow } },
      schema: {
        body: Type.Object(
          {
            email: emailSchema,
            password: passwordSchema,
            displayName: Type.String({ minLength: 1, maxLength: 120 }),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const { email, password, displayName } = request.body;
      if (app.repos.users.findByEmail(email)) {
        throw conflict('An account with that email already exists', 'email_taken');
      }
      const passwordHash = await hashPassword(password, app.env.passwordPepper);
      const user = app.repos.users.create({ id: newId('usr'), email, displayName, passwordHash });
      const body = await issueSession(reply, user);
      reply.status(201).send(body);
    },
  );

  app.post(
    '/login',
    {
      config: { rateLimit: { max: app.env.authRateLimitMax, timeWindow: app.env.rateLimitWindow } },
      schema: {
        body: Type.Object(
          { email: emailSchema, password: passwordSchema },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const found = app.repos.users.findByEmail(email);
      // Same error + always run a verify to reduce user-enumeration timing signal.
      const ok = found
        ? await verifyPassword(found.passwordHash, password, app.env.passwordPepper)
        : await verifyPassword(
            '$argon2id$v=19$m=19456,t=2,p=1$0000$0000',
            password,
            app.env.passwordPepper,
          );
      if (!found || !ok) {
        throw unauthorized('Invalid email or password', 'invalid_credentials');
      }
      const body = await issueSession(reply, found.dto);
      reply.send(body);
    },
  );

  // Refresh — reads the token from the httpOnly cookie or the request body.
  // CSRF-protected because it acts on an ambient cookie credential.
  app.post(
    '/refresh',
    {
      onRequest: app.csrfProtection,
      schema: {
        body: Type.Optional(
          Type.Object(
            { refreshToken: Type.Optional(Type.String()) },
            { additionalProperties: false },
          ),
        ),
      },
    },
    async (request, reply) => {
      const signed = request.cookies[REFRESH_COOKIE];
      const fromCookie = signed ? app.unsignCookie(signed).value : null;
      const token = fromCookie ?? request.body?.refreshToken;
      if (!token) {
        throw unauthorized('Missing refresh token', 'missing_refresh');
      }
      let claims;
      try {
        claims = await verifyRefreshToken(token, app.env.jwtRefreshSecret);
      } catch {
        throw unauthorized('Invalid refresh token', 'invalid_refresh');
      }
      if (!app.repos.refreshTokens.isActive(claims.jti)) {
        throw unauthorized('Refresh token expired or revoked', 'inactive_refresh');
      }
      const user = app.repos.users.findById(claims.sub);
      if (!user) {
        throw unauthorized('Account no longer exists', 'no_account');
      }
      // Rotate: invalidate the used token, issue a fresh session.
      app.repos.refreshTokens.revoke(claims.jti);
      const body = await issueSession(reply, user);
      reply.send(body);
    },
  );

  app.post('/logout', { onRequest: app.csrfProtection }, async (request, reply) => {
    const signed = request.cookies[REFRESH_COOKIE];
    const token = signed ? app.unsignCookie(signed).value : null;
    if (token) {
      try {
        const claims = await verifyRefreshToken(token, app.env.jwtRefreshSecret);
        app.repos.refreshTokens.revoke(claims.jti);
      } catch {
        // Already invalid — nothing to revoke.
      }
    }
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    reply.status(204).send();
  });

  // Issue a CSRF token for the SPA to send back on refresh/logout.
  app.get('/csrf', async (_request, reply) => {
    const token = await reply.generateCsrf();
    reply.send({ csrfToken: token });
  });

  app.get('/me', { preHandler: app.requireUser }, async (request) => {
    const principal = request.principal;
    if (!principal) {
      throw unauthorized();
    }
    const user = app.repos.users.findById(principal.userId);
    if (!user) {
      throw badRequest('Account not found', 'no_account');
    }
    return user;
  });
}
