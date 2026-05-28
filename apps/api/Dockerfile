# --- Builder stage ---------------------------------------------------------
FROM node:20-slim AS builder

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /repo

# Copy workspace manifests for caching pnpm install.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --filter @baby/api... --frozen-lockfile

# Now copy source + prisma + the OpenAPI yaml the api reads at runtime.
COPY apps/api ./apps/api
COPY openspec/changes/init-baby-weaning-tracker/openapi.yaml \
     ./openspec/changes/init-baby-weaning-tracker/openapi.yaml
COPY tsconfig.base.json ./

WORKDIR /repo/apps/api
RUN pnpm prisma generate
RUN pnpm build

# --- Runtime stage ---------------------------------------------------------
FROM node:20-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# pull only what we need to run
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/prisma ./prisma
COPY --from=builder /repo/apps/api/package.json ./
COPY --from=builder /repo/openspec/changes/init-baby-weaning-tracker/openapi.yaml \
     /openspec/changes/init-baby-weaning-tracker/openapi.yaml

# Run prisma migrations on container start, then start the API.
EXPOSE 3000
CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js migrate deploy && node dist/index.js"]
