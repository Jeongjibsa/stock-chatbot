FROM node:24.14.0-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/telegram-bot/package.json apps/telegram-bot/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/application/package.json packages/application/package.json
COPY packages/core-types/package.json packages/core-types/package.json

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm build

CMD ["pnpm", "--filter", "@stock-chatbot/worker", "start"]
