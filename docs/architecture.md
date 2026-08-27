# Architecture

> Living document. Each Architectural Decision (AD) below is the canonical
> answer to "why is it like this?" — when reality drifts, update this file.

## Overview

Task Kanban Flow is a kanban task management platform built as an
**Angular 21 monorepo** with **Turborepo + pnpm workspaces**. Three
applications — `apps/web` (end users), `apps/api` (Fastify + SQLite REST
backend) and `apps/mcp` (MCP server over the same API) — share seven
internal packages under the `@tkf/*` npm scope.

```
┌─────────────────────────────────────────────────────────────┐
│                       apps/                                 │
│   ┌────────────────────┐       ┌────────────────────┐       │
│   │  web  (port 4200)  │       │  mcp  (stdio)      │       │
│   └─────────┬──────────┘       └─────────┬──────────┘       │
│             │        HTTP / API key      │                  │
│             └──────────────┬─────────────┘                  │
│                            ▼                                │
│                 ┌────────────────────┐                      │
│                 │  api  (port 3000)  │                      │
│                 └────────────────────┘                      │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  @tkf/ui  @tkf/design-tokens                                │
│  @tkf/shared-types  @tkf/shared-utils                       │
│  @tkf/eslint-config  @tkf/ts-config                         │
└─────────────────────────────────────────────────────────────┘
```

## Architectural Decisions

### AD-01 · Turborepo + pnpm workspaces (not Nx)

Turborepo is leaner than Nx and focuses on caching + task orchestration
rather than scaffolding. pnpm workspaces give strict peer resolution,
preventing phantom dependencies. Centralised Angular/TS versions via
workspace `devDependencies`.

### AD-02 · One UI app; the API is the shared surface

An `apps/admin` scaffold existed in Phase 0 and was removed — it never grew
past a placeholder route and a second Angular app buys blast-radius isolation
nobody was paying for yet. Administration is a role check inside `apps/web`.
The API stays the shared surface: `apps/web` and `apps/mcp` both talk to
`apps/api` over HTTP, so a second consumer never needs a second backend.

### AD-03 · Clean Architecture per feature

Every feature in `apps/<app>/src/app/features/<name>/` is layered:

- `domain/` — pure-TS entities/VOs/ports (no Angular)
- `application/` — use cases, facades
- `infrastructure/` — HttpClient repositories, MSW handlers
- `presentation/` — components, Signal Store
- `routes/` — lazy-loaded `Routes`

Trade-off: more files. Justified by portability and test isolation.

### AD-04 · Signal Store per feature (NgRx `@ngrx/signals@21`)

Stores are scoped per feature; only `core/auth` is cross-feature.
Communication across features uses facades, never selectors. The
classic global NgRx store is intentionally avoided — signals give
equivalent type-safety with less boilerplate.

### AD-05 · MSW as transport mock; the app code stays real

MSW intercepts at the network layer, so the feature repositories
(`infrastructure/http-*.repository.ts`) are oblivious to whether it is active.
Toggle via `environment.useMockApi`. The same code path runs against
`apps/api`.

### AD-06 · Jest 30 (SWC transformer) for unit/integration

Chosen for explicit request. Karma/Jasmine stripped. Playwright covers E2E.

### AD-07 · Playwright for E2E with sharding

Three shards run in parallel in CI for ~3× throughput. MSW can run inside
Playwright contexts, enabling deterministic API fixtures.

### AD-08 · Storybook in `@tkf/ui` only

The design system is the natural consumer. Stories are co-located as
`.stories.ts` next to the component, but coverage is partial: 8 of the 12
components have one (field, loading, select and textarea do not).

### AD-09 · Shared ESLint flat configs (`@tkf/eslint-config`)

Base / Angular / Jest / Storybook configs. Each package imports via
`workspace:*`. Includes selector prefix enforcement (`tkf-`).

### AD-10 · Husky + lint-staged + commitlint (Conventional Commits)

Pre-commit runs Prettier + ESLint on staged files. Commit-msg enforces
`feat:` / `fix:` / `chore:` / etc. Foundations for automated CHANGELOG.

### AD-11 · Design tokens via Style Dictionary

`packages/design-tokens` emits CSS variables (light at `:root`,
dark at `[data-theme="dark"]`) and a typed JS object. Runtime theme
switching without rebuild.

### AD-12 · `@angular/localize` for i18n — markers only, so far

Angular 21's native i18n is sufficient for two locales, so no third-party
library. Current state: `@angular/localize/init` is in the polyfills and
templates carry `i18n` / `i18n-*` markers. **No locale is configured yet** —
there are no `.xlf` files and `angular.json` declares no `i18n` block, so the
app builds and runs in source (pt-BR) text only. Extraction
(`ng extract-i18n`) and the `en-US` translation are the remaining work.

### AD-13 · JWT + Refresh + team RBAC

`core/auth` ships with: `JwtService`, `AuthHttpInterceptor`, `AuthStore`,
`AuthGuard`. Authorisation is enforced server-side only: every repository query
is scoped to the authenticated principal (teams by membership, boards by
team/board membership, clients by owner, columns/tasks/secrets through their
board), and team administration is gated by the team role
`owner | admin | member` (`apps/api/src/http/access.ts`). A cross-tenant read
returns `404`, not `403`, so existence is never confirmed. API keys carry an
orthogonal scope, `read | read_write`, checked by the `requireWrite` preHandler.

### AD-14 · Multi-stage Docker → nginx-alpine + API service

`apps/web` ships a `Dockerfile` whose final image is nginx-alpine with hashed
static assets and SPA fallback; `apps/api` ships one that builds with tsup and
runs on a plain Node image. `docker compose up` starts both and nginx
`proxy_pass`es `/api/` to the API container, which is what the production build
expects (`environment.prod.ts` uses the relative base URL `/api/v1`).

### AD-15 · GitHub Actions with pnpm cache + sharded E2E

Jobs: setup → lint, test-unit, build → e2e (×3 shards), docker-build.
Concurrency group cancels superseded runs.

### AD-16 · Sentry SDK inert by default

`@sentry/angular` is installed and `Sentry.init` runs only when
`environment.sentry.dsn` is non-empty. It is empty in both `environment.ts` and
`environment.prod.ts`, so the SDK is inert in this repo and the app uses a
console `ErrorHandler`. Enabling it means putting a real DSN in
`environment.prod.ts` and rebuilding — the DSN is not read from an env var.

### AD-17 · No features in Phase 0 (superseded)

Phase 0 shipped only a `health-check` feature; everything else was
scaffolding. Superseded by Phases 1 and 1.5 — auth, boards, teams, clients,
the secrets vault and the REST/MCP backends now live in the same layers.

## Layer rules (enforced in review)

1. **`domain/` must not import from `@angular/*`.**
2. **`presentation/` may import from `application/`, `domain/`, and Angular.**
3. **`infrastructure/` implements `domain/` ports. Never the other way around.**
4. **Cross-feature imports are forbidden** — use a shared service in `core/` or
   expose a facade through `application/`.
5. **`@tkf/ui` may not depend on any feature or app.**
6. **`@tkf/shared-types` is DOM-free** — DTOs only, no Angular.

## Naming conventions

- Selectors: `tkf-<feature>-<component>` (e.g. `tkf-boards-card`).
- Files: `kebab-case.suffix.ts` where suffix ∈ `component | service | directive | guard | pipe | routes | store | stories | spec`.
- Types: `PascalCase`. Interfaces preferred over `type` aliases.
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- Branches: `main`, `feat/*`, `fix/*`, `chore/*`, `docs/*`.
