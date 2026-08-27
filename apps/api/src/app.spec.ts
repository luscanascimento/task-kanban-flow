import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import { buildTestApp, registerUser } from './test/harness';

/** One HTTP call in a `[method, url, payload?]` table. */
type Call = readonly [string, string, object?];

/** `app.inject` for a table row — the payload key is omitted when there is none. */
async function send(
  app: FastifyInstance,
  [method, url, payload]: Call,
  headers: Record<string, string>,
): Promise<LightMyRequestResponse> {
  const base = { method: method as 'POST', url, headers };
  const options: InjectOptions = payload === undefined ? base : { ...base, payload };
  return app.inject(options);
}

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

  it('revokes the whole refresh family when a rotated token is replayed', async () => {
    const refresh = async (refreshToken: string): Promise<LightMyRequestResponse> =>
      app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken } });

    const registered = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'replay@example.com', password: 'password123', displayName: 'Replay' },
    });
    const stolen = (registered.json() as { tokens: { refreshToken: string } }).tokens.refreshToken;

    // Legitimate rotation: the stolen copy is now stale.
    const rotated = await refresh(stolen);
    expect(rotated.statusCode).toBe(200);
    const current = (rotated.json() as { tokens: { refreshToken: string } }).tokens.refreshToken;

    // The thief replays the stale copy.
    const replayed = await refresh(stolen);
    expect(replayed.statusCode).toBe(401);
    expect(replayed.json()).toMatchObject({ code: 'inactive_refresh' });

    // The replay must burn the victim's live token too, not just the stale one.
    expect((await refresh(current)).statusCode).toBe(401);
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
      const post = async <T>(url: string, payload: object): Promise<T> =>
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
      const writes: readonly Call[] = [
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

      for (const call of writes) {
        const [method, url] = call;
        const res = await send(app, call, ro);
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

  describe('tenant isolation', () => {
    interface Fixture {
      readonly a: { authorization: string };
      readonly b: { authorization: string };
      readonly bUserId: string;
      readonly team: string;
      readonly board: string;
      readonly column: string;
      readonly task: string;
      readonly client: string;
      readonly secret: string;
    }

    /** User A owns a full object graph; user B is an unrelated tenant. */
    async function twoTenants(prefix: string): Promise<Fixture> {
      const userA = await registerUser(app, `${prefix}-a@example.com`);
      const userB = await registerUser(app, `${prefix}-b@example.com`);
      const a = { authorization: `Bearer ${userA.accessToken}` };
      const b = { authorization: `Bearer ${userB.accessToken}` };

      const post = async <T>(url: string, payload: object): Promise<T> =>
        (await app.inject({ method: 'POST', url, headers: a, payload })).json() as T;

      const team = await post<{ id: string }>('/api/v1/teams', { name: `${prefix} team` });
      const board = await post<{ id: string }>('/api/v1/boards', {
        teamId: team.id,
        title: 'Private board',
      });
      const column = await post<{ id: string }>(`/api/v1/boards/${board.id}/columns`, {
        title: 'Backlog',
        position: 0,
      });
      const task = await post<{ id: string }>(`/api/v1/boards/${board.id}/tasks`, {
        columnId: column.id,
        title: 'Private task',
      });
      const client = await post<{ id: string }>('/api/v1/clients', { name: 'Private client' });
      const secret = await post<{ id: string }>(`/api/v1/boards/${board.id}/secrets`, {
        platform: 'AWS',
        label: 'root',
        authType: 'password',
        secret: 'do-not-leak',
      });

      return {
        a,
        b,
        bUserId: userB.userId,
        team: team.id,
        board: board.id,
        column: column.id,
        task: task.id,
        client: client.id,
        secret: secret.id,
      };
    }

    it("never lists another user's teams, boards or clients", async () => {
      const f = await twoTenants('list');
      for (const url of ['/api/v1/teams', '/api/v1/boards', '/api/v1/clients']) {
        const res = await app.inject({ method: 'GET', url, headers: f.b });
        expect({ url, status: res.statusCode }).toEqual({ url, status: 200 });
        expect({ url, items: (res.json() as { items: unknown[] }).items }).toEqual({
          url,
          items: [],
        });
      }
    });

    it("answers 404 (never 403) when reading another user's resources", async () => {
      const f = await twoTenants('read');
      const reads = [
        `/api/v1/teams/${f.team}`,
        `/api/v1/teams/${f.team}/boards`,
        `/api/v1/boards/${f.board}`,
        `/api/v1/boards/${f.board}/columns`,
        `/api/v1/boards/${f.board}/tasks`,
        `/api/v1/boards/${f.board}/secrets`,
        `/api/v1/tasks/${f.task}`,
        `/api/v1/clients/${f.client}`,
        `/api/v1/clients/${f.client}/boards`,
      ];
      for (const url of reads) {
        const res = await app.inject({ method: 'GET', url, headers: f.b });
        // 404, not 403: a 403 would confirm the id exists.
        expect({ url, status: res.statusCode }).toEqual({ url, status: 404 });
        expect(JSON.stringify(res.json())).not.toContain('do-not-leak');
      }
    });

    it("cannot mutate another user's resources, and leaves them intact", async () => {
      const f = await twoTenants('write');
      const writes: readonly Call[] = [
        ['PATCH', `/api/v1/teams/${f.team}`, { name: 'pwned' }],
        ['DELETE', `/api/v1/teams/${f.team}`],
        ['POST', `/api/v1/teams/${f.team}/members`, { email: 'x@example.com', role: 'admin' }],
        ['DELETE', `/api/v1/teams/${f.team}/members/${f.bUserId}`],
        ['POST', '/api/v1/boards', { teamId: f.team, title: 'pwned' }],
        ['PATCH', `/api/v1/boards/${f.board}`, { title: 'pwned' }],
        ['DELETE', `/api/v1/boards/${f.board}`],
        ['POST', `/api/v1/boards/${f.board}/columns`, { title: 'pwned', position: 1 }],
        ['POST', '/api/v1/columns', { boardId: f.board, title: 'pwned', position: 1 }],
        ['PATCH', `/api/v1/columns/${f.column}`, { title: 'pwned' }],
        ['DELETE', `/api/v1/columns/${f.column}`],
        ['POST', `/api/v1/boards/${f.board}/columns/reorder`, { orderedIds: [f.column] }],
        ['POST', `/api/v1/boards/${f.board}/tasks`, { columnId: f.column, title: 'pwned' }],
        ['PATCH', `/api/v1/tasks/${f.task}`, { title: 'pwned' }],
        ['POST', `/api/v1/tasks/${f.task}/move`, { targetColumnId: f.column, targetPosition: 0 }],
        [
          'POST',
          `/api/v1/tasks/${f.task}/attachments`,
          { name: 'a.png', mimeType: 'image/png', url: 'data:image/png;base64,AA==', sizeBytes: 2 },
        ],
        ['DELETE', `/api/v1/tasks/${f.task}`],
        ['PATCH', `/api/v1/clients/${f.client}`, { name: 'pwned' }],
        ['DELETE', `/api/v1/clients/${f.client}`],
        [
          'POST',
          `/api/v1/boards/${f.board}/secrets`,
          { platform: 'AWS', label: 'pwned', authType: 'password', secret: 'pwned' },
        ],
        ['PATCH', `/api/v1/secrets/${f.secret}`, { label: 'pwned' }],
        ['DELETE', `/api/v1/secrets/${f.secret}`],
      ];

      for (const call of writes) {
        const [method, url] = call;
        const res = await send(app, call, f.b);
        expect({ method, url, status: res.statusCode }).toEqual({ method, url, status: 404 });
      }

      // Everything user A owns is untouched.
      const board = await app.inject({
        method: 'GET',
        url: `/api/v1/boards/${f.board}`,
        headers: f.a,
      });
      expect(board.json()).toMatchObject({ id: f.board, title: 'Private board' });
      const task = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${f.task}`,
        headers: f.a,
      });
      expect(task.json()).toMatchObject({ id: f.task, title: 'Private task' });
      const secrets = await app.inject({
        method: 'GET',
        url: `/api/v1/boards/${f.board}/secrets`,
        headers: f.a,
      });
      expect((secrets.json() as { items: { label: string }[] }).items).toEqual([
        expect.objectContaining({ label: 'root' }),
      ]);
    });

    it('cannot move a task into a board it does not own', async () => {
      const f = await twoTenants('move');
      const own = await twoTenants('move-own');
      // `own.b` is a stranger to both graphs; use user A of the second fixture,
      // who legitimately owns a task, and try to park it in f's column.
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${own.task}/move`,
        headers: own.a,
        payload: { targetColumnId: f.column, targetPosition: 0 },
      });
      expect(res.statusCode).toBe(404);
      const still = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${own.task}`,
        headers: own.a,
      });
      expect(still.json()).toMatchObject({ columnId: own.column });
    });

    it('enforces the team role: a member reads and creates boards but cannot administer', async () => {
      const f = await twoTenants('rbac');
      const invited = await app.inject({
        method: 'POST',
        url: `/api/v1/teams/${f.team}/members`,
        headers: f.a,
        payload: { email: 'rbac-b@example.com', role: 'member' },
      });
      expect(invited.statusCode).toBe(200);

      // A member sees the team…
      const read = await app.inject({
        method: 'GET',
        url: `/api/v1/teams/${f.team}`,
        headers: f.b,
      });
      expect(read.statusCode).toBe(200);

      // …and may open a board in it…
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: f.b,
        payload: { teamId: f.team, title: 'Member board' },
      });
      expect(created.statusCode).toBe(201);

      // …but cannot rename it, delete it or manage members (403 — membership is
      // no longer secret at this point, only the role is insufficient).
      const denied: readonly Call[] = [
        ['PATCH', `/api/v1/teams/${f.team}`, { name: 'renamed' }],
        ['DELETE', `/api/v1/teams/${f.team}`],
        [
          'POST',
          `/api/v1/teams/${f.team}/members`,
          { email: 'rbac-a@example.com', role: 'member' },
        ],
      ];
      for (const call of denied) {
        const [method, url] = call;
        const res = await send(app, call, f.b);
        expect({ method, url, status: res.statusCode }).toEqual({ method, url, status: 403 });
        expect(res.json()).toMatchObject({ code: 'insufficient_role' });
      }

      // An admin can rename, but only the owner can delete.
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/teams/${f.team}/members/${f.bUserId}`,
        headers: f.a,
        payload: { role: 'admin' },
      });
      const renamed = await app.inject({
        method: 'PATCH',
        url: `/api/v1/teams/${f.team}`,
        headers: f.b,
        payload: { name: 'renamed by admin' },
      });
      expect(renamed.statusCode).toBe(200);
      const deleted = await app.inject({
        method: 'DELETE',
        url: `/api/v1/teams/${f.team}`,
        headers: f.b,
      });
      expect(deleted.statusCode).toBe(403);
    });
  });
});
