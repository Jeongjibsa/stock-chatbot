import { Pool } from "pg";
import { normalizePostgresConnectionString } from "@stock-chatbot/database";

declare global {
  var __stockChatbotWebPool: Pool | undefined;
}

export function getWebPool() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  const { normalizedConnectionString, ssl } =
    normalizePostgresConnectionString(databaseUrl);
  const pool =
    globalThis.__stockChatbotWebPool ??
    new Pool({
      connectionString: normalizedConnectionString,
      max: 1,
      ...(ssl ? { ssl } : {})
    });

  if (!globalThis.__stockChatbotWebPool) {
    globalThis.__stockChatbotWebPool = pool;
  }

  return pool;
}
