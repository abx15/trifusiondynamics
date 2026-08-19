FROM node:20-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and monorepo configs from build context
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY services/auth/package.json ./services/auth/
COPY services/auth/tsconfig.json ./services/auth/
COPY services/auth/tsconfig.build.json ./services/auth/
COPY services/auth/nest-cli.json ./services/auth/
COPY services/auth/src ./services/auth/src

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm --filter database db:generate
RUN pnpm --filter auth build

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000
CMD ["node", "services/auth/dist/main.js"]

