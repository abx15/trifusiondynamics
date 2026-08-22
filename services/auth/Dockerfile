FROM node:20-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy monorepo root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy database package for Prisma generation
COPY packages/database/ ./packages/database/

# Copy auth service
COPY services/auth/ ./services/auth/

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Generate Prisma client and build auth service
RUN pnpm --filter @agency-os/database db:generate
RUN cd services/auth && pnpm run build

ENV NODE_ENV=production

# Render will inject PORT environment variable
EXPOSE 8000

CMD ["node", "services/auth/dist/main.js"]
