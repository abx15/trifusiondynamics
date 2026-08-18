# Stage 1: Dependencies & Build
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm

# Copy monorepo configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/admin-dashboard/ ./apps/admin-dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build admin-dashboard
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm --filter admin-dashboard build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/apps/admin-dashboard/public ./apps/admin-dashboard/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-dashboard/.next/static ./apps/admin-dashboard/.next/static

USER nextjs

EXPOSE 3001

CMD ["node", "apps/admin-dashboard/server.js"]

