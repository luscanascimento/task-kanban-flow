# syntax=docker/dockerfile:1.7
# Multi-stage build for apps/web — pnpm + Angular CLI in builder, nginx-alpine runtime.
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/web ./apps/web
COPY tsconfig.json ./
# Build tokens first, then the Angular app.
RUN pnpm --filter @tkf/design-tokens tokens \
  && pnpm --filter @tkf/web build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/web/dist/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
