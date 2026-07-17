# Design: Secure Backend, Public API-Key API & MCP Server

**Date:** 2026-07-17
**Status:** Implemented (initial slice)
**Branch:** `feat/portfolio-hardening`

## Problem

Task Kanban Flow was frontend-only (Angular + stateful MSW mock). We wanted:

1. A real backend extracted from the mock — one source of truth.
2. A **public REST API** external clients can query with an **API key**.
3. A **screen to manage API keys** (create/revoke), key valid only when it
   exists and `deleted_at` is empty.
4. An **MCP server** so AI agents can drive the kanban (full CRUD; secrets
   metadata only).
5. **Comprehensive security** across the stack.
6. **Guides** for API consumers, MCP setup, and architecture.

## Decisions (locked with the user)

| Decision         | Choice                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Data source      | Extract the MSW mock into a standalone Node service                 |
| Persistence      | SQLite (`better-sqlite3`), seeded from the mock dataset             |
| Public API scope | Per-key scopes: `read` \| `read_write`                              |
| API-key secret   | Shown once, stored as HMAC-SHA256(pepper)                           |
| Key validity     | Exists **and** `deleted_at IS NULL` (soft delete)                   |
| MCP              | stdio; full CRUD; calls REST with an API key; secrets metadata only |
| Runtime topology | MCP (stdio) → REST service over HTTP; the service owns the data     |
| Web app          | Stays on MSW for now (no regression); flip documented               |
| Guides           | API consumer, MCP setup, architecture/dev                           |

## Architecture

Three consumers over one SQLite via `apps/api` (Fastify): the web app (future),
external API-key clients, and `apps/mcp`. Repositories mirror the frontend's
hexagonal split; DTOs from `@tkf/shared-types` are the shared contract.

- **`apps/api`** — Fastify + SQLite. Auth (JWT + rotating refresh), API-key
  management, kanban CRUD, teams, clients, secrets. OpenAPI at `/docs`.
- **`apps/mcp`** — `@modelcontextprotocol/sdk` stdio server; 21 tools; typed
  REST client; `TKF_API_URL` + `TKF_API_KEY`.
- **`apps/web`** — (planned) `features/api-keys/` slice + `/settings/api-keys`.

## Security design

Argon2id + salt + pepper (passwords) · AES-256-GCM at rest (secrets) ·
HMAC-SHA256 + constant-time compare (API keys) · Helmet + strict CSP · CORS
locked to the web origin · rate limiting (global + auth) · CSRF on the cookie
refresh flow · TypeBox/AJV input validation + sanitisation · 100% parameterized
SQL · central error handler with no 5xx leakage. Secrets required in prod; dev
uses ephemeral secrets with a warning. Details in `docs/backend-architecture.md`.

## What was implemented

- Full `apps/api` with the security stack above; 21 unit + integration tests;
  verified live (boot, login, key create→use→revoke→401, secret non-exposure,
  security headers).
- Full `apps/mcp` with 21 tools; verified live via an MCP stdio client.
- Guides: `docs/api-guide.md`, `docs/mcp-guide.md`, `docs/backend-architecture.md`.

## Deferred / next

- `features/api-keys/` management screen in the Angular app + `/settings/api-keys`
  route and MSW bypass for `/api/v1/*`.
- Point the web app at the API (`useMockApi=false`) as the shared backend.
- Broaden test coverage (repository edge cases, refresh rotation, CSRF flow).
- Optional: per-team authorization on API-key access (multi-tenant hardening).

## Open questions resolved during build

- **Param naming** — find-my-way requires consistent param names at a path
  position; board routes use `:boardId` throughout.
- **Jest + Fastify ESM** — `@fastify/cookie` uses dynamic `import()`; jest runs
  under SWC compiled to CommonJS with a targeted `transformIgnorePatterns`.
- **Native builds** — `better-sqlite3` build is allow-listed via
  `pnpm.onlyBuiltDependencies`.
