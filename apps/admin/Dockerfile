# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/admin/package.json ./apps/admin/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/admin ./apps/admin
COPY tsconfig.json ./
RUN pnpm --filter @tkf/design-tokens tokens \
  && pnpm --filter @tkf/admin build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/admin/dist/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
