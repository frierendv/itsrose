FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1

RUN corepack enable
RUN pnpm install -g turbo

FROM base AS prepare
COPY . .
RUN turbo prune auth-api --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ ./

RUN --mount=type=cache,target=/pnpm/store \
	pnpm install --frozen-lockfile

ENV NODE_ENV=production
COPY --from=prepare /app/out/full/ ./
RUN pnpm pack -r
RUN pnpm run build --filter=auth-api...
RUN pnpm deploy --filter=auth-api --prod /prod/auth-api

FROM gcr.io/distroless/nodejs24-debian13 AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /prod/auth-api ./

EXPOSE 3000
CMD ["dist/main.mjs"]
