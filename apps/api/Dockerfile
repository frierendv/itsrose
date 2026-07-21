
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS prepare
ENV TURBO_TELEMETRY_DISABLED=1
COPY . .
RUN turbo prune api --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ ./
COPY --from=prepare /app/clean-package.config.json ./clean-package.config.json

RUN --mount=type=cache,target=/root/.cache \
	npm ci --include=dev

COPY --from=prepare /app/out/full/ ./
RUN turbo run prepack --filter=api...

RUN node apps/api/scripts/build.js


FROM gcr.io/distroless/nodejs24-debian13 AS runner
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/out/ ./
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["apps/api/dist/main.mjs"]
