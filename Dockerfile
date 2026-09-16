# syntax=docker/dockerfile:1

# Debian slim rather than Alpine: both Prisma (query engine) and sharp (image
# optimization) ship first-class glibc builds, which removes the usual musl
# footguns. `openssl` is required by the Prisma query engine.
ARG NODE_IMAGE=node:22-bookworm-slim

# ---------------------------------------------------------------------------
# deps — install node_modules once, reused by builder and migrator
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
# prisma/ is needed here because `postinstall` runs `prisma generate`
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# builder — next build
# ---------------------------------------------------------------------------
# No build args are declared: by this phase every NEXT_PUBLIC_* and DATABASE_URL
# reference has been removed from the code, so a single image can be promoted
# across dev1/staging1/prod without rebuilding.
FROM deps AS builder
WORKDIR /app
COPY . .

# The release this image was built from — CI passes the semantic-release
# version (or `unknown` locally) and /api/health echoes it back.
ARG APP_VERSION=unknown

# Build-time stubs. `next build` imports every route module to collect page
# data; a couple of them (`/api/send-email`'s SMTP client, better-auth's
# secret check) throw at module-load time when their env vars are absent. The
# dummies below are never read at runtime — the runner stage does not inherit
# them, and `app/api/health` only echoes APP_VERSION — so a single image still
# promotes across dev1 / staging1 / prod without rebuilding.
#
# REDIS_URL is deliberately absent: lib/rate-limit.ts opens its connection on
# first use rather than at import, so the build never touches Redis.
ENV APP_VERSION=${APP_VERSION} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    SMTP_HOST=localhost \
    SMTP_PORT=1025 \
    SMTP_SECURE=false \
    SMTP_USER=dummy \
    SMTP_PASS=dummy \
    SMTP_FROM_EMAIL=noreply@localhost \
    BETTER_AUTH_SECRET=build_only_dummy_secret_at_least_32_chars_xx
RUN pnpm run build

# ---------------------------------------------------------------------------
# migrator — one-shot `prisma migrate deploy`, run before the app starts
# (this is what `vercel.json` used to do inside its buildCommand)
# ---------------------------------------------------------------------------
FROM deps AS migrator
WORKDIR /app
ENV NODE_ENV=production
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# runner — minimal standalone server
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
