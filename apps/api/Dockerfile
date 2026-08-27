# syntax=docker/dockerfile:1.7
# Multi-stage build for apps/api — pnpm + tsup in the builder, plain Node runtime.
FROM node:22-bookworm-slim AS builder
# python3/make/g++ are only needed when better-sqlite3 has no prebuilt binary
# for this platform; they never reach the runtime image.
RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY apps/api ./apps/api
RUN pnpm --filter @tkf/api build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
# The workspace tree carries the already-compiled native bindings
# (better-sqlite3, @node-rs/argon2), so the runtime needs no toolchain.
COPY --from=builder /workspace /workspace
# The SQLite file lives on a volume mounted at /data; a fresh named volume
# inherits this directory's ownership, so the unprivileged user can write it.
RUN mkdir -p /data && chown node:node /data
WORKDIR /workspace/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
