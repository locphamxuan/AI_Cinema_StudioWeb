# syntax=docker/dockerfile:1

# AI Cinema — Studio Web (Next.js App Router) production image.
#
# Every setting this app reads (AI_CINEMA_API_URL, STUDIO_WEB_URL, the OAuth client, ...) is read per
# request on the server (src/lib/config.ts), so nothing is baked in: the same image runs in any
# environment and the values come from the container's env (see docker-compose.yml / .env.example).
#
#   docker build -t ai-cinema-studio-web .
#   docker run --rm -p 3100:3100 --env-file .env ai-cinema-studio-web
#
# Or `docker compose up -d --build` (see docker-compose.yml).

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Dependencies, including devDependencies: Tailwind, PostCSS and TypeScript only build the app.
FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# 2. Production build. NEXT_OUTPUT=standalone (next.config.ts) keeps only the traced files and server.js.
FROM base AS builder
ENV NODE_ENV=production \
    NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Runtime: the standalone bundle only — no npm, no devDependencies, no source tree.
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3100 \
    HOSTNAME=0.0.0.0

# server.js serves .next/static itself; .next/cache is written by image optimisation. This app
# ships no public/ assets, so there is nothing to copy from there.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown node:node .next/cache

USER node
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3100)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
