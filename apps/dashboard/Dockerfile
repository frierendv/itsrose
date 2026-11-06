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
# NEXT_PUBLIC_* values are inlined by `next build`, so they must be passed as
# build args (or left empty to use the config/site.ts fallbacks).
ARG NEXT_PUBLIC_APP_BASE_URL=
ARG NEXT_PUBLIC_AUTH_BASE_URL=
ARG NEXT_PUBLIC_APP_NAME=
ARG NEXT_PUBLIC_APP_TITLE=
ARG NEXT_PUBLIC_APP_DESCRIPTION=
ARG NEXT_PUBLIC_AUTHOR_GITHUB_TITLE=
ARG NEXT_PUBLIC_AUTHOR_GITHUB_URL=

COPY --from=prepare /app/out/json/ ./

RUN --mount=type=cache,target=/pnpm/store \
	pnpm install --frozen-lockfile

ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_BASE_URL=$NEXT_PUBLIC_APP_BASE_URL
ENV NEXT_PUBLIC_AUTH_BASE_URL=$NEXT_PUBLIC_AUTH_BASE_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_TITLE=$NEXT_PUBLIC_APP_TITLE
ENV NEXT_PUBLIC_APP_DESCRIPTION=$NEXT_PUBLIC_APP_DESCRIPTION
ENV NEXT_PUBLIC_AUTHOR_GITHUB_TITLE=$NEXT_PUBLIC_AUTHOR_GITHUB_TITLE
ENV NEXT_PUBLIC_AUTHOR_GITHUB_URL=$NEXT_PUBLIC_AUTHOR_GITHUB_URL

COPY --from=prepare /app/out/full/ ./

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
