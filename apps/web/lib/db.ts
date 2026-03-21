import { Pool } from "pg";

declare global {
  var __stockChatbotWebPool: Pool | undefined;
}

function shouldUseSsl(databaseUrl: string) {
  return databaseUrl.includes("sslmode=require") || databaseUrl.includes(".neon.tech");
}

export function getWebPool() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  const pool =
    globalThis.__stockChatbotWebPool ??
    new Pool({
      connectionString: databaseUrl,
      max: 1,
      ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined
    });

  if (!globalThis.__stockChatbotWebPool) {
    globalThis.__stockChatbotWebPool = pool;
  }

  return pool;
}
