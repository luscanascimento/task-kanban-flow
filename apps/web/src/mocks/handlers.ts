import { http, HttpResponse } from 'msw';

/**
 * MSW request handlers. Mirror the contracts in @tkf/shared-types.
 * The scaffolding phase ships only `/health` and stub auth endpoints.
 */
export const handlers = [
  http.get('*/health', () =>
    HttpResponse.json({
      status: 'ok',
      version: '0.0.0',
      timestamp: new Date().toISOString(),
    }),
  ),

  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (!body.email || !body.password) {
      return HttpResponse.json(
        { statusCode: 400, code: 'INVALID_CREDENTIALS', message: 'Email and password required.' },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      user: {
        id: 'usr_001',
        email: body.email,
        displayName: body.email.split('@')[0] ?? 'User',
        role: 'member',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
        accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  }),

  http.post('*/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; displayName: string };
    if (!body.email || !body.password || !body.displayName) {
      return HttpResponse.json(
        {
          statusCode: 400,
          code: 'INVALID_INPUT',
          message: 'Email, password, and displayName are required.',
        },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      user: {
        id: 'usr_' + Math.random().toString(36).slice(2, 8),
        email: body.email,
        displayName: body.displayName,
        role: 'member',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
        accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  }),

  http.post('*/auth/refresh', () =>
    HttpResponse.json({
      user: {
        id: 'usr_001',
        email: 'demo@example.com',
        displayName: 'Demo',
        role: 'member',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'mock.access.token.rotated',
        refreshToken: 'mock.refresh.token.rotated',
        accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }),
  ),

  http.post('*/auth/logout', () => new HttpResponse(null, { status: 204 })),
];
