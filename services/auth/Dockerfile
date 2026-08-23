FROM node:20-bookworm-slim
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY services/ ./services/
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @agency-os/database db:generate
RUN pnpm --filter @agency-os/types run build
RUN pnpm --filter auth run build
ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "services/auth/dist/main.js"]
