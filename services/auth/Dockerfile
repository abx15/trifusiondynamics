# Stage 1: Build
FROM node:20-bookworm-slim AS builder

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy packages and services
COPY packages/ ./packages/
COPY services/auth/ ./services/auth/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm --filter database db:generate

# Build the auth service
RUN pnpm --filter auth build

# Stage 2: Production
FROM node:20-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Install pnpm
RUN npm install -g pnpm

# Copy built artifacts and production dependencies only
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/services/auth/package.json ./services/auth/
COPY --from=builder /app/services/auth/dist ./services/auth/dist

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Re-generate Prisma Client in prod
RUN pnpm --filter database db:generate

ENV PORT=8000

EXPOSE 8000

CMD ["node", "services/auth/dist/main.js"]

