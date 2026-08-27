# Task Kanban Flow — Backend Architecture & Security

How the in-browser MSW mock became a real service, how the pieces fit, and the
security posture. Covers `apps/api` (REST) and `apps/mcp` (MCP server).

---

## 1. Why a backend now

The web app (`apps/web`) shipped against a **stateful MSW mock** — great for a
zero-backend demo, but the data lived in a browser tab and reset on reload.
To support (a) a public API for external clients, (b) an MCP server for AI
agents, and (c) durable, shared state, we extracted the mock's contract into a
real service backed by SQLite. The DTOs in `packages/shared-types` are the
shared contract, so the service, the app, and the MCP all speak the same shapes.

```
                      ┌──────────────────────────────┐
  apps/web  ─────────▶│                              │
  (Angular, later)    │   apps/api  (Fastify)        │
                      │   /api/v1/**                 │──▶ SQLite (better-sqlite3)
  External client ───▶│   auth: JWT (app)            │      apps/api/data/tkf.db
  (API key)           │         or API key (scoped)  │
                      │                              │
  apps/mcp  ─────────▶│  (MCP → REST with API key)   │
  (AI agent)          └──────────────────────────────┘
```

> Current state: the Angular app still uses MSW by default (no regression). The
> API is the source of truth for external clients + the MCP + API-key
> management. Pointing the app at the API is a documented next step (flip
> `environment.useMockApi` and set `apiBaseUrl`).

---

## 2. Layout (`apps/api/src`)

```
env.ts                 Validated environment (secrets required in prod)
app.ts                 buildApp(): wires plugins + routes; testable with a :memory: db
main.ts                Boot: seed on first run, listen, graceful shutdown
db/
  schema.ts            DDL (single source, portable across tsx/tsup/jest)
  client.ts            openDb() with hardening PRAGMAs; id/timestamp helpers
  seed.ts              Idempotent demo dataset (Argon2 hashed users, encrypted secret)
crypto/
  password.ts          Argon2id + pepper
  encryption.ts        AES-256-GCM envelope for secrets at rest
  api-key.ts           Generate + HMAC-SHA256 hash + constant-time compare
  tokens.ts            JWT access + rotating refresh (jose)
repositories/          One repo per aggregate; 100% parameterized SQL
plugins/
  security.ts          Helmet, CORS, rate limit, cookie, CSRF, Swagger
  auth.ts              requireUser / requirePrincipal / requireWrite guards
http/                  ApiError + central error handler (no 5xx leakage) + access.ts authorization guards
routes/                auth, api-keys, kanban (boards/columns/tasks), teams, clients, secrets
```

Repositories mirror the frontend's hexagonal split: routes are the transport
adapter, repositories are the persistence adapter, DTOs are the domain contract.

---

## 3. Data model

`Team → Board → Column → Task`. Clients belong to the user who registered
them (`clients.owner_id`); secrets are board-scoped.
Task value-objects (`labels`, `checklistItems`, `attachments`) are stored as
JSON columns. See `apps/api/src/db/schema.ts` for the DDL. Notable columns:

- `api_keys.deleted_at` — soft delete. A key is valid **iff it exists AND
  `deleted_at IS NULL`** (enforced in the lookup SQL).
- `secrets.secret_encrypted` — AES-256-GCM envelope, never the plaintext.
- `team_members.role` / `board_members` — the only source of authorization; a
  board is reachable iff the caller is in its team or in `board_members`.
- `refresh_tokens` — rotation store enabling logout and reuse detection: a
  refresh presents a `jti` that is revoked on use, so replaying an already
  rotated token revokes every live token for that user (`auth.routes.ts`).

---

## 4. Security posture

| Concern              | Mitigation                                                                                                                                                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authorization**    | Every read and write is scoped to the caller: teams by membership, boards by team/board membership, clients by owner, columns/tasks/secrets through their board. Cross-tenant access answers `404`, never `403`, so ids are not confirmed. Team roles `owner`/`admin`/`member` gate team administration (`http/access.ts`) |
| **User enumeration** | Unknown-email logins verify against a real Argon2id hash of a random secret, so a failed login costs the same whether or not the account exists                                                                                                                                                                            |
| **SQL injection**    | 100% parameterized prepared statements (better-sqlite3); no string interpolation                                                                                                                                                                                                                                           |
| **Password storage** | Argon2id (19 MiB, t=2) + per-hash random salt + server-side **pepper** (HMAC pre-hash)                                                                                                                                                                                                                                     |
| **Secrets at rest**  | AES-256-GCM with per-record IV + auth tag; API returns metadata only                                                                                                                                                                                                                                                       |
| **API keys**         | Shown once; stored as HMAC-SHA256(pepper); constant-time compare; soft-delete revocation                                                                                                                                                                                                                                   |
| **Sessions**         | Short-lived JWT access + rotating refresh in an httpOnly, SameSite=strict, signed cookie. Replaying a rotated refresh token revokes the whole family                                                                                                                                                                       |
| **CSRF**             | Refresh cookie is httpOnly + **SameSite=strict** (a cross-site page can't send it); body-based bearer refresh isn't ambient. `GET /auth/csrf` issues a token for stricter cookie-only setups.                                                                                                                              |
| **XSS (headers)**    | Helmet with a strict Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`                                                                                                                                                                                                               |
| **CORS**             | Locked to configured web origin(s); credentials allowed only for them                                                                                                                                                                                                                                                      |
| **Rate limiting**    | Global per-IP cap + stricter cap on auth routes; `429` with retry hint                                                                                                                                                                                                                                                     |
| **Input validation** | TypeBox/AJV schemas per route; unknown fields stripped, types/lengths enforced                                                                                                                                                                                                                                             |
| **Error leakage**    | Central handler returns a stable `ApiErrorDto`; 5xx details are logged, not returned                                                                                                                                                                                                                                       |
| **TLS/HTTPS**        | Terminated at the reverse proxy (see `docker/nginx`); set `COOKIE_SECURE=true` behind it                                                                                                                                                                                                                                   |

**Secrets & config** (`apps/api/.env`, see `.env.example`): `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `PASSWORD_PEPPER`, `APIKEY_PEPPER`, `SECRETS_ENC_KEY`
(32 bytes). All **required in production** — the process refuses to start
without them. In dev they are generated ephemerally with a loud warning.

---

## 5. Running & testing

```bash
pnpm --filter @tkf/api dev         # dev server, seeds demo data
pnpm --filter @tkf/api test        # crypto unit tests + inject() integration tests
pnpm --filter @tkf/api build       # tsup → dist/main.js
pnpm --filter @tkf/api typecheck   # tsc --noEmit
```

Tests run against an in-memory SQLite via `buildApp({ env, db })` and Fastify's
`app.inject()` — no ports, no network. They cover the security-critical paths:
weak-password rejection, input sanitisation, refresh-token reuse detection,
API-key create→use→revoke→401 (the `deleted_at` rule), scope enforcement,
secret-value non-exposure, and tenant isolation (one user can neither read nor mutate another's team, board,
column, task, client or secret, and gets `404` rather than `403`).

---

## 6. Extending

- **New entity**: add a table in `db/schema.ts`, a repo in `repositories/`,
  wire it into `createRepositories`, add a route file with TypeBox schemas, and
  register it in `app.ts`. Add MCP tools in `apps/mcp/src/tools.ts` if agents
  need it.
- **Run the web app against the real backend** (instead of MSW):
  1. Terminal 1 — `pnpm --filter @tkf/api dev` (backend on :3000, seeds demo data).
  2. In `apps/web/src/environments/environment.ts` set `useMockApi: false`
     (`apiBaseUrl` is already `http://localhost:3000/api/v1`). MSW only starts
     when `useMockApi` is true, so turning it off routes every call to the API.
  3. Terminal 2 — `pnpm --filter @tkf/web dev`; sign in with
     `demo@example.com` / `password123`.

  The app's HTTP adapters are backend-agnostic: list endpoints tolerate both a
  bare array (MSW) and the API's `{ items }` envelope (`shared/util/unwrap-items.ts`),
  and the API accepts the app's payload variants (flat `POST /columns`,
  `orderedColumnIds` on reorder). Default stays on MSW so tests/CI are offline
  and unchanged.

- **Real deployment**: put it behind the nginx config in `docker/`, set
  `COOKIE_SECURE=true`, provide real secrets, and use a persistent volume for
  `data/`.
