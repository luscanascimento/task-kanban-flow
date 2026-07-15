# Task Kanban Flow

> **Enterprise-grade kanban task management platform.**
> Portfolio project: Angular 21 · Turborepo · Clean Architecture · DDD.
> Built to demonstrate how a Staff Frontend Engineer would structure a
> production-grade Angular application from scratch.

[![CI](https://github.com/luscanascimento/task-kanban-flow/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)
[![CodeQL](https://github.com/luscanascimento/task-kanban-flow/actions/workflows/codeql.yml/badge.svg)](./.github/workflows/codeql.yml)

---

## Stack

| Layer         | Choice                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------- | ------- | ------ | -------- |
| Framework     | Angular **21** (standalone components, signals, zoneless)                                            |
| State         | [`@ngrx/signals`](https://ngrx.io/guide/signals) per feature                                         |
| Routing       | Angular Router (lazy-loaded, view transitions)                                                       |
| Forms         | Angular Reactive Forms                                                                               |
| i18n          | `@angular/localize` — pt-BR (default) + en-US                                                        |
| Build         | Angular CLI + `@angular-devkit/build-angular`                                                        |
| Monorepo      | [Turborepo](https://turbo.build/repo) + **pnpm** workspaces                                          |
| Language      | TypeScript **strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)                     |
| Lint          | ESLint 9 flat config (`@tkf/eslint-config`)                                                          |
| Format        | Prettier                                                                                             |
| Pre-commit    | Husky + lint-staged + commitlint (Conventional Commits)                                              |
| Unit tests    | Jest 30 + [`jest-preset-angular`](https://thymikee.github.io/jest-preset-angular/) + Testing Library |
| E2E           | Playwright (3-shard parallelism in CI)                                                               |
| Storybook     | Storybook 10 (component catalog in `@tkf/ui`)                                                        |
| Mock API      | [MSW 2](https://mswjs.io) (browser + node)                                                           |
| Design tokens | Style Dictionary → CSS variables + typed JS                                                          |
| Theming       | Light/Dark via `[data-theme]` on `<html>`                                                            |
| Containers    | Multi-stage Dockerfile → nginx-alpine                                                                |
| CI/CD         | GitHub Actions (pnpm cache + Turbo cache)                                                            |
| Observability | Sentry SDK wired (DSN-gated)                                                                         |
| Security      | JWT + refresh + RBAC (`admin                                                                         | manager | member | viewer`) |

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

# 4. Run unit tests (shared-utils)
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
│   │   │   │   ├── core/       # Auth, http, sentry, theme, i18n
│   │   │   │   ├── features/   # Each feature = Clean Architecture layers
│   │   │   │   ├── shared/     # Layout, app-level dumb components
│   │   │   │   ├── app.config.ts
│   │   │   │   └── app.routes.ts
│   │   │   ├── assets/i18n/    # pt-BR.json, en-US.json
│   │   │   ├── environments/   # environment.ts, environment.prod.ts
│   │   │   ├── mocks/          # MSW handlers, browser, server
│   │   │   └── main.ts
│   │   ├── angular.json
│   │   ├── Dockerfile
│   │   └── playwright.config.ts
│   └── admin/                  # Admin app (port 4300) — mirror of web/
│
├── packages/
│   ├── ui/                     # Design system (tkf-button, tkf-loading, …)
│   ├── api-client/             # Typed HttpClient wrappers
│   ├── shared-types/           # Pure-TS DTOs (DOM-free)
│   ├── shared-utils/           # Pure-TS helpers + Jest tests
│   ├── design-tokens/          # Style Dictionary → CSS/JS tokens
│   ├── eslint-config/          # Shared ESLint flat configs
│   └── ts-config/              # Shared tsconfig bases
│
├── docker/
│   └── nginx/default.conf      # SPA-fallback nginx config used by Dockerfile
│
├── docs/
│   └── architecture.md         # 17 ADs + layer rules
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

| Command                           | Effect                                                  |
| --------------------------------- | ------------------------------------------------------- |
| `pnpm install`                    | Install all workspace dependencies                      |
| `pnpm tokens`                     | Rebuild design tokens (`packages/design-tokens/dist/`)  |
| `pnpm build`                      | Build all apps + packages (Turborepo DAG)               |
| `pnpm dev`                        | Run both apps in dev mode                               |
| `pnpm --filter @tkf/web dev`      | Run only the web app                                    |
| `pnpm test`                       | Run unit tests across the workspace                     |
| `pnpm test:watch`                 | Jest watch mode                                         |
| `pnpm e2e`                        | Run Playwright E2E (requires built apps or `webServer`) |
| `pnpm lint`                       | ESLint across all packages                              |
| `pnpm lint:fix`                   | ESLint with `--fix`                                     |
| `pnpm format`                     | Prettier write across the workspace                     |
| `pnpm --filter @tkf/ui storybook` | Start Storybook for `@tkf/ui` (port 6006)               |
| `pnpm clean`                      | Remove all `node_modules` and build artifacts           |
| `docker compose build`            | Build both Docker images                                |
| `docker compose up`               | Serve web on `:4200`, admin on `:4300`                  |

---

## Architecture in one breath

Two apps share seven packages. Every feature inside an app follows
**Clean Architecture**: `domain → application → infrastructure → presentation`.
State is **per-feature NgRx Signal Store**. HTTP goes through typed
**`@tkf/api-client`** classes that MSW intercepts in dev/test. Themes are
**CSS variables emitted by Style Dictionary**. Tests: **Jest unit**,
**Playwright E2E**. CI: **GitHub Actions with sharded E2E + Docker builds**.

Full design rationale: **[`docs/architecture.md`](./docs/architecture.md)** (17 ADs).

---

## Roadmap

| Phase                 | Scope                                                                                                                              | Status     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **0 — Foundation**    | Monorepo, tooling, Clean Arch skeleton, MSW, CI/CD, Docker, docs                                                                   | ✅ Shipped |
| **1 — Core features** | Auth (login/register/refresh), boards, columns, cards, priorities, WIP limits, **card + column drag-and-drop**, card search/filter | ✅ Shipped |
| **1.5 — Workspaces**  | Teams (roles + membership-gated boards), Clients registry, per-board Secrets vault, card attachments (images/PDF/docs)             | ✅ Shipped |
| **2 — Collaboration** | Labels, comments, activity history, checklist editing, non-image file upload                                                       | ⏳ Next    |
| **3 — Analytics**     | Dashboard, charts, SLA, reports                                                                                                    | Planned    |
| **4 — Realtime**      | WebSocket, live updates, notifications, presence                                                                                   | Planned    |

The `@tkf/ui` design system ships 12 token-driven, accessible components
(button, input, select, textarea, field, avatar, badge, card, skeleton,
modal, loading, toast) documented in **Storybook** (`pnpm --filter @tkf/ui storybook`).
Unit tests: **119** (Jest) across the web app and shared packages.

---

## License

MIT — built by [Lucas Gabriel Ferreira do Nascimento](https://github.com/luscanascimento)
as a portfolio demonstration of enterprise Angular architecture.
