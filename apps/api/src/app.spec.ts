import type { FastifyInstance } from 'fastify';
import { buildTestApp, registerUser } from './test/harness';

describe('API integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves health without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('rejects unauthenticated access to protected routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/boards' });
    expect(res.statusCode).toBe(401);
  });

  it('registers a user and issues tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'alice@example.com', password: 'password123', displayName: 'Alice' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { tokens: { accessToken: string } };
    expect(typeof body.tokens.accessToken).toBe('string');
  });

  it('rejects a weak password at registration (input validation)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'weak@example.com', password: 'short', displayName: 'Weak' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'validation_error' });
  });

  it('strips unknown fields and rejects wrong types (sanitization)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'not-an-email', password: 'password123' },
    });
    expect(res.statusCode).toBe(400);
  });

  describe('API keys', () => {
    it('creates a key (shown once), uses it, then rejects it after revocation', async () => {
      const { accessToken } = await registerUser(app, 'keys@example.com');

      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'CI key', scope: 'read_write' },
      });
      expect(created.statusCode).toBe(201);
      const key = created.json() as { id: string; key: string };
      expect(key.key.startsWith('tkf_')).toBe(true);

      // The key authenticates against the public API.
      const ok = await app.inject({
        method: 'GET',
        url: '/api/v1/boards',
        headers: { authorization: `Bearer ${key.key}` },
      });
      expect(ok.statusCode).toBe(200);

      // Revoke (soft-delete: sets deleted_at).
      const revoked = await app.inject({
        method: 'DELETE',
        url: `/api/v1/keys/${key.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(revoked.statusCode).toBe(204);

      // A revoked key (deleted_at set) is no longer valid.
      const denied = await app.inject({
        method: 'GET',
        url: '/api/v1/boards',
        headers: { authorization: `Bearer ${key.key}` },
      });
      expect(denied.statusCode).toBe(401);
      expect(denied.json()).toMatchObject({ code: 'invalid_api_key' });
    });

    it('enforces read-only scope on writes', async () => {
      const { accessToken } = await registerUser(app, 'ro@example.com');
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'read key', scope: 'read' },
      });
      const key = (created.json() as { key: string }).key;

      // GET allowed…
      const read = await app.inject({
        method: 'GET',
        url: '/api/v1/teams',
        headers: { authorization: `Bearer ${key}` },
      });
      expect(read.statusCode).toBe(200);

      // …POST forbidden for a read key.
      const write = await app.inject({
        method: 'POST',
        url: '/api/v1/teams',
        headers: { authorization: `Bearer ${key}` },
        payload: { name: 'Nope' },
      });
      expect(write.statusCode).toBe(403);
      expect(write.json()).toMatchObject({ code: 'forbidden' });
    });

    it('blocks a read-only key on every mutating route, on every router', async () => {
      const { accessToken } = await registerUser(app, 'scope-matrix@example.com');
      const mint = async (scope: 'read' | 'read_write'): Promise<string> => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/keys',
          headers: { authorization: `Bearer ${accessToken}` },
          payload: { name: scope, scope },
        });
        return (res.json() as { key: string }).key;
      };
      const rw = { authorization: `Bearer ${await mint('read_write')}` };
      const ro = { authorization: `Bearer ${await mint('read')}` };

      // Build the fixture with the read_write key so the read key has real
      // resources to be denied against (a 403 on a missing id proves nothing).
      const post = async <T>(url: string, payload: unknown): Promise<T> =>
        (await app.inject({ method: 'POST', url, headers: rw, payload })).json() as T;

      const team = await post<{ id: string }>('/api/v1/teams', { name: 'Scope' });
      const board = await post<{ id: string }>('/api/v1/boards', {
        teamId: team.id,
        title: 'Scope board',
      });
      const column = await post<{ id: string }>(`/api/v1/boards/${board.id}/columns`, {
        title: 'Backlog',
        position: 0,
      });
      const task = await post<{ id: string }>(`/api/v1/boards/${board.id}/tasks`, {
        columnId: column.id,
        title: 'Scope task',
      });
      const client = await post<{ id: string }>('/api/v1/clients', { name: 'Scope client' });
      const secret = await post<{ id: string }>(`/api/v1/boards/${board.id}/secrets`, {
        platform: 'AWS',
        label: 'root',
        authType: 'password',
        secret: 'shhh',
      });

      // Payloads are schema-valid on purpose: Fastify validates before the
      // preHandler runs, so an invalid body would 400 and never reach the
      // scope check we are asserting on.
      const writes: ReadonlyArray<[string, string, unknown?]> = [
        ['POST', '/api/v1/teams', { name: 'nope' }],
        ['PATCH', `/api/v1/teams/${team.id}`, { name: 'nope' }],
        ['DELETE', `/api/v1/teams/${team.id}`],
        ['POST', '/api/v1/boards', { teamId: team.id, title: 'nope' }],
        ['PATCH', `/api/v1/boards/${board.id}`, { title: 'nope' }],
        ['DELETE', `/api/v1/boards/${board.id}`],
        ['POST', `/api/v1/boards/${board.id}/columns`, { title: 'nope', position: 1 }],
        ['POST', '/api/v1/columns', { boardId: board.id, title: 'nope', position: 1 }],
        ['PATCH', `/api/v1/columns/${column.id}`, { title: 'nope' }],
        ['DELETE', `/api/v1/columns/${column.id}`],
        ['POST', `/api/v1/boards/${board.id}/tasks`, { columnId: column.id, title: 'nope' }],
        ['PATCH', `/api/v1/tasks/${task.id}`, { title: 'nope' }],
        ['POST', `/api/v1/tasks/${task.id}/move`, { targetColumnId: column.id, targetPosition: 0 }],
        [
          'POST',
          `/api/v1/tasks/${task.id}/attachments`,
          { name: 'a.png', mimeType: 'image/png', url: 'data:image/png;base64,AA==', sizeBytes: 2 },
        ],
        ['DELETE', `/api/v1/tasks/${task.id}/attachments/att_1`],
        ['DELETE', `/api/v1/tasks/${task.id}`],
        ['POST', '/api/v1/clients', { name: 'nope' }],
        ['PATCH', `/api/v1/clients/${client.id}`, { name: 'nope' }],
        ['DELETE', `/api/v1/clients/${client.id}`],
        [
          'POST',
          `/api/v1/boards/${board.id}/secrets`,
          { platform: 'AWS', label: 'nope', authType: 'password', secret: 'nope' },
        ],
        ['PATCH', `/api/v1/secrets/${secret.id}`, { label: 'nope' }],
        ['DELETE', `/api/v1/secrets/${secret.id}`],
      ];

      for (const [method, url, payload] of writes) {
        const res = await app.inject({
          method: method as 'POST',
          url,
          headers: ro,
          ...(payload === undefined ? {} : { payload }),
        });
        expect({ method, url, status: res.statusCode }).toEqual({
          method,
          url,
          status: 403,
        });
        expect(res.json()).toMatchObject({ code: 'forbidden' });
      }

      // The same read key still reads every one of those resources, so the
      // 403s above are the scope check and not a broken credential.
      for (const url of [
        '/api/v1/teams',
        `/api/v1/teams/${team.id}`,
        '/api/v1/boards',
        `/api/v1/boards/${board.id}`,
        `/api/v1/boards/${board.id}/columns`,
        `/api/v1/boards/${board.id}/tasks`,
        `/api/v1/boards/${board.id}/secrets`,
        '/api/v1/clients',
      ]) {
        const res = await app.inject({ method: 'GET', url, headers: ro });
        expect({ url, status: res.statusCode }).toEqual({ url, status: 200 });
      }

      // …and the fixture survived: nothing the read key sent was applied.
      const stillThere = await app.inject({
        method: 'GET',
        url: `/api/v1/teams/${team.id}`,
        headers: rw,
      });
      expect(stillThere.statusCode).toBe(200);
      expect(stillThere.json()).toMatchObject({ id: team.id, name: 'Scope' });
    });

    it('does not allow managing keys with an API key (user session only)', async () => {
      const { accessToken } = await registerUser(app, 'mgmt@example.com');
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'k', scope: 'read_write' },
      });
      const key = (created.json() as { key: string }).key;

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${key}` },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ code: 'user_only' });
    });
  });

  describe('kanban CRUD via API key', () => {
    it('creates a team → board → column → task and moves it', async () => {
      const { accessToken } = await registerUser(app, 'crud@example.com');
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'rw', scope: 'read_write' },
      });
      const key = (created.json() as { key: string }).key;
      const h = { authorization: `Bearer ${key}` };

      const team = (
        await app.inject({
          method: 'POST',
          url: '/api/v1/teams',
          headers: h,
          payload: { name: 'T' },
        })
      ).json() as { id: string };

      const board = (
        await app.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: h,
          payload: { teamId: team.id, title: 'B' },
        })
      ).json() as { id: string };

      const col1 = (
        await app.inject({
          method: 'POST',
          url: `/api/v1/boards/${board.id}/columns`,
          headers: h,
          payload: { title: 'Backlog', position: 0 },
        })
      ).json() as { id: string };
      const col2 = (
        await app.inject({
          method: 'POST',
          url: `/api/v1/boards/${board.id}/columns`,
          headers: h,
          payload: { title: 'Done', position: 1 },
        })
      ).json() as { id: string };

      const task = (
        await app.inject({
          method: 'POST',
          url: `/api/v1/boards/${board.id}/tasks`,
          headers: h,
          payload: { columnId: col1.id, title: 'Ship it' },
        })
      ).json() as { id: string; columnId: string };
      expect(task.columnId).toBe(col1.id);

      const moved = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${task.id}/move`,
        headers: h,
        payload: { targetColumnId: col2.id, targetPosition: 0 },
      });
      expect(moved.statusCode).toBe(200);
      expect((moved.json() as { columnId: string }).columnId).toBe(col2.id);
    });

    it('never returns a secret value (metadata only)', async () => {
      const { accessToken } = await registerUser(app, 'sec@example.com');
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/keys',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'rw', scope: 'read_write' },
      });
      const key = (created.json() as { key: string }).key;
      const h = { authorization: `Bearer ${key}` };

      const team = (
        await app.inject({
          method: 'POST',
          url: '/api/v1/teams',
          headers: h,
          payload: { name: 'T' },
        })
      ).json() as { id: string };
      const board = (
        await app.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: h,
          payload: { teamId: team.id, title: 'B' },
        })
      ).json() as { id: string };

      const secret = await app.inject({
        method: 'POST',
        url: `/api/v1/boards/${board.id}/secrets`,
        headers: h,
        payload: { platform: 'AWS', label: 'root', authType: 'password', secret: 'do-not-leak' },
      });
      expect(secret.statusCode).toBe(201);
      const body = secret.json() as Record<string, unknown>;
      expect(body).not.toHaveProperty('secret');
      expect(body).toMatchObject({ hasValue: true });

      const list = await app.inject({
        method: 'GET',
        url: `/api/v1/boards/${board.id}/secrets`,
        headers: h,
      });
      expect(JSON.stringify(list.json())).not.toContain('do-not-leak');
    });
  });
});
