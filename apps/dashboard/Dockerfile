FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1

RUN corepack enable
RUN pnpm install -g turbo

FROM base AS prepare
COPY . .
RUN turbo prune dashboard --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ ./

RUN --mount=type=cache,target=/pnpm/store \
	pnpm install --frozen-lockfile

ENV NODE_ENV=production
COPY --from=prepare /app/out/full/ ./

# Make sure env exist in the root project.
COPY .env.dashboard ./apps/dashboard/.env.production

# next transpile
RUN pnpm run build --filter=dashboard...

FROM gcr.io/distroless/nodejs24-debian13 AS runner
WORKDIR /app
ENV NODE_ENV=production

# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public

EXPOSE 3000
CMD ["apps/dashboard/server.js"]
