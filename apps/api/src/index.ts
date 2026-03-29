import "dotenv/config";

import { fileURLToPath } from "node:url";
import { Redis } from "ioredis";
import { createPool } from "@stock-chatbot/database";

import { buildApp } from "./app.js";
import { readConfig } from "./config.js";

async function main(): Promise<void> {
  const config = readConfig();
  const database = createPool(config.databaseUrl);
  const redis = new Redis(config.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });
  const server = buildApp({
    checkDatabase: async () => {
      await database.query("select 1");
      return true;
    },
    checkRedis: async () => {
      if (redis.status !== "ready") {
        await redis.connect();
      }

      await redis.ping();
      return true;
    },
    environment: config.nodeEnv
  });

  const shutdown = async (signal: string) => {
    server.log.info({ signal }, "shutting down api");
    await server.close();
    await database.end();
    redis.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  await server.listen({
    host: config.apiHost,
    port: config.port
  });
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
