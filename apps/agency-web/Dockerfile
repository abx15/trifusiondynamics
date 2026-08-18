# Stage 1: Dependencies & Build
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm

# Copy monorepo configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/agency-web/ ./apps/agency-web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build agency-web
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm --filter agency-web build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/apps/agency-web/public ./apps/agency-web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/agency-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/agency-web/.next/static ./apps/agency-web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/agency-web/server.js"]
