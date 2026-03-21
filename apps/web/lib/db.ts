import { Pool } from "pg";

declare global {
  var __stockChatbotWebPool: Pool | undefined;
}

export function getWebPool() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  const pool =
    globalThis.__stockChatbotWebPool ??
    new Pool({
      connectionString: databaseUrl
    });

  if (!globalThis.__stockChatbotWebPool) {
    globalThis.__stockChatbotWebPool = pool;
  }

  return pool;
}
