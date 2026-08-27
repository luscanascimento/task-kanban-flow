# Task Kanban Flow

> Multi-tenant kanban with a **per-board secrets vault (AES-256-GCM,
> versioned envelope)**, **scoped API keys** (HMAC-SHA256 + server-side pepper,
> stored hashed, compared in constant time) and a **hardened Fastify backend**
> (CSP via Helmet, origin allow-list CORS, per-IP rate limiting, CSRF-protected
> refresh-cookie flow).
>
> Angular 21 (standalone, signals, zoneless) · Fastify + SQLite · Turborepo ·
> Clean Architecture. Personal portfolio project.

[![CI](https://github.com/luscanascimento/task-kanban-flow/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)
[![CodeQL](https://github.com/luscanascimento/task-kanban-flow/actions/workflows/codeql.yml/badge.svg)](./.github/workflows/codeql.yml)

---

## Stack

| Layer         | Choice                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework     | Angular **21** (standalone components, signals, zoneless)                                                                                        |
| State         | [`@ngrx/signals`](https://ngrx.io/guide/signals) per feature                                                                                     |
| Routing       | Angular Router (lazy-loaded, view transitions)                                                                                                   |
| Forms         | Angular Reactive Forms                                                                                                                           |
| i18n          | `@angular/localize` polyfill + `i18n` markers in templates — locale extraction pending                                                           |
| Build         | Angular CLI + `@angular-devkit/build-angular`                                                                                                    |
| Monorepo      | [Turborepo](https://turbo.build/repo) + **pnpm** workspaces                                                                                      |
| Language      | TypeScript **strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)                                                                 |
| Lint          | ESLint 9 flat config (`@tkf/eslint-config`)                                                                                                      |
| Format        | Prettier                                                                                                                                         |
| Pre-commit    | Husky + lint-staged + commitlint (Conventional Commits)                                                                                          |
| Unit tests    | Jest 30 + [`jest-preset-angular`](https://thymikee.github.io/jest-preset-angular/) + Testing Library                                             |
| E2E           | Playwright (3-shard parallelism in CI)                                                                                                           |
| Storybook     | Storybook 10 (component catalog in `@tkf/ui`)                                                                                                    |
| Mock API      | [MSW 2](https://mswjs.io) (browser + node)                                                                                                       |
| Design tokens | Style Dictionary → CSS variables + typed JS                                                                                                      |
| Theming       | Light/Dark via `[data-theme]` on `<html>`                                                                                                        |
| Containers    | Multi-stage Dockerfiles (web → nginx-alpine, api → Node) wired together by `docker-compose.yml`                                                  |
| CI/CD         | GitHub Actions (pnpm cache + Turbo cache)                                                                                                        |
| Observability | Sentry SDK wired (DSN-gated)                                                                                                                     |
| Security      | JWT + refresh cookie; per-principal data scoping on every route; team RBAC (`owner` / `admin` / `member`); API keys scoped `read` / `read_write` |

---

## Quickstart

```bash
# 1. Install pnpm (≥ 9)
corepack enable && corepack prepare pnpm@10.2.0 --activate

# 2. Clone & install
git clone git@github.com:luscanascimento/task-kanban-flow.git
cd task-kanban-flow
pnpm install

# 3. Build design tokens (generates packages/design-tokens/dist/)
pnpm tokens

# 4. Run unit tests across the workspace
pnpm test

# 5. Start dev server (web on :4200)
pnpm --filter @tkf/web dev

# 6. Generate MSW worker (once per app)
pnpm --filter @tkf/web exec msw init apps/web/public/
```

---

## Project layout

```
task-kanban-flow/
├── apps/
│   ├── web/                    # User-facing app (port 4200)
│   │   ├── e2e/                # Playwright specs
│   │   ├── public/             # Static assets + MSW worker
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/       # auth, data, http, sentry, theme
│   │   │   │   ├── features/   # Each feature = Clean Architecture layers
│   │   │   │   ├── shared/     # Layout, app-level dumb components
│   │   │   │   ├── app.config.ts
│   │   │   │   └── app.routes.ts
│   │   │   ├── environments/   # environment.ts, environment.prod.ts
│   │   │   ├── mocks/          # MSW handlers, browser, server
│   │   │   └── main.ts
│   │   ├── angular.json
│   │   ├── Dockerfile
│   │   └── playwright.config.ts
│   ├── api/                    # Security-hardened REST backend (Fastify + SQLite, port 3000, has its own Dockerfile)
│   └── mcp/                    # MCP server — lets AI agents drive the kanban via the API
│
├── packages/
│   ├── ui/                     # Design system (tkf-button, tkf-loading, …)
│   ├── shared-types/           # Pure-TS DTOs (DOM-free)
│   ├── shared-utils/           # Pure-TS helpers + Jest tests
│   ├── design-tokens/          # Style Dictionary → CSS/JS tokens
│   ├── eslint-config/          # Shared ESLint flat configs
│   └── ts-config/              # Shared tsconfig bases
│
├── docker/
│   └── nginx/default.conf      # SPA fallback + /api/ proxy_pass to the api service
│
├── docs/
│   ├── architecture.md         # 17 ADs + layer rules
│   ├── api-guide.md            # Public REST API: keys, endpoints, curl examples
│   ├── mcp-guide.md            # MCP server setup for Claude Desktop / Code
│   └── backend-architecture.md # apps/api design + full security posture
│
├── .github/workflows/          # ci.yml, codeql.yml
├── .husky/                     # pre-commit, commit-msg
├── eslint.config.mjs
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── package.json
```

---

## Common commands

| Command                           | Effect                                                             |
| --------------------------------- | ------------------------------------------------------------------ |
| `pnpm install`                    | Install all workspace dependencies                                 |
| `pnpm tokens`                     | Rebuild design tokens (`packages/design-tokens/dist/`)             |
| `pnpm build`                      | Build all apps + packages (Turborepo DAG)                          |
| `pnpm dev`                        | Run every app's dev task in parallel                               |
| `pnpm --filter @tkf/web dev`      | Run only the web app                                               |
| `pnpm --filter @tkf/api dev`      | Run the REST backend on `:3000` (seeds demo data; docs at `/docs`) |
| `pnpm --filter @tkf/mcp build`    | Build the MCP server (`apps/mcp/dist/main.js`)                     |
| `pnpm test`                       | Run unit tests across the workspace                                |
| `pnpm test:watch`                 | Jest watch mode                                                    |
| `pnpm e2e`                        | Run Playwright E2E (requires built apps or `webServer`)            |
| `pnpm lint`                       | ESLint across all packages                                         |
| `pnpm lint:fix`                   | ESLint with `--fix`                                                |
| `pnpm format`                     | Prettier write across the workspace                                |
| `pnpm --filter @tkf/ui storybook` | Start Storybook for `@tkf/ui` (port 6006)                          |
| `pnpm clean`                      | Remove all `node_modules` and build artifacts                      |
| `docker compose build`            | Build the web + api Docker images                                  |
| `docker compose up`               | Serve the full stack on `:4200` (nginx proxies `/api/` to the api) |

---

## Architecture in one breath

One Angular app, one Fastify API and one MCP server share six packages.
Every feature inside the web app follows
**Clean Architecture**: `domain → application → infrastructure → presentation`.
State is **per-feature NgRx Signal Store**. HTTP goes through each feature's
typed `infrastructure/http-*.repository.ts`, which MSW intercepts in dev/test.
Themes are
**CSS variables emitted by Style Dictionary**. Tests: **Jest unit**,
**Playwright E2E**. CI: **GitHub Actions with sharded E2E + Docker builds**.

Full design rationale: **[`docs/architecture.md`](./docs/architecture.md)** (17 ADs).

---

## Roadmap

| Phase                 | Scope                                                                                                                              | Status     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **0 — Foundation**    | Monorepo, tooling, Clean Arch skeleton, MSW, CI/CD, Docker, docs                                                                   | ✅ Shipped |
| **1 — Core features** | Auth (login/register/refresh), boards, columns, cards, priorities, WIP limits, **card + column drag-and-drop**, card search/filter | ✅ Shipped |
| **1.5 — Workspaces**  | Teams (roles + membership-gated boards), Clients registry, per-board Secrets vault, card attachments (see caveat below)            | ✅ Shipped |
| **2 — Collaboration** | Labels, comments, activity history, checklist editing, non-image file upload                                                       | ⏳ Next    |
| **3 — Analytics**     | Dashboard, charts, SLA, reports                                                                                                    | Planned    |
| **4 — Realtime**      | WebSocket, live updates, notifications, presence                                                                                   | Planned    |

### Caveat — attachments are inline, not object storage

Card attachments are stored as **base64 data URLs in the `tasks.attachments`
TEXT column** of SQLite, capped at 5 MiB per file
(`apps/web/.../task-dialog.component.ts`, mirrored by the route schema in
`apps/api/src/routes/kanban.routes.ts`) under a 6 MiB Fastify `bodyLimit`
(`apps/api/src/app.ts`). That is deliberate for a self-contained demo — no
bucket, no signed URLs, no lifecycle policy to run — and it has a real
ceiling: attachment bytes inflate both the database file and every task JSON
response, since a task is returned with its attachments inline. Production
would move the blob to object storage (S3/R2) and keep only key + metadata in
the row; the DTO already carries `name`, `mimeType`, `sizeBytes` and `url`, so
`url` becomes a signed URL and nothing else in the shape changes.

### Design system

The `@tkf/ui` design system ships 12 token-driven, accessible components
(button, input, select, textarea, field, avatar, badge, card, skeleton,
modal, loading, toast) documented in **Storybook** (`pnpm --filter @tkf/ui storybook`).

### Tests

`pnpm test` runs **213** Jest tests: 117 in `apps/web`, 44 in `apps/api`
(crypto unit tests + `app.spec.ts`, which boots the real Fastify instance
against an in-memory SQLite and drives it through `app.inject`, including the
tenant-isolation suite), 48 in `@tkf/shared-utils` and 4 in `apps/mcp`. `@tkf/ui` is covered by Storybook,
not Jest. Playwright covers the browser flows in `apps/web/e2e`.

---

## License

MIT — built by [Lucas Gabriel Ferreira do Nascimento](https://github.com/luscanascimento).
