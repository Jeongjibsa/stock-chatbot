import { Pool } from "pg";

import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema.js";

export function createPool(connectionString: string): Pool {
  const { normalizedConnectionString, ssl } =
    normalizePostgresConnectionString(connectionString);

  return new Pool({
    connectionString: normalizedConnectionString,
    ...(ssl ? { ssl } : {})
  });
}

export function createDatabase(pool: Pool) {
  return drizzle(pool, { schema });
}

export type DatabaseClient = ReturnType<typeof createDatabase>;

export function normalizePostgresConnectionString(connectionString: string): {
  normalizedConnectionString: string;
  ssl?: { rejectUnauthorized: false };
} {
  let parsed: URL;

  try {
    parsed = new URL(connectionString);
  } catch {
    return {
      normalizedConnectionString: connectionString
    };
  }

  const sslRequested =
    parsed.searchParams.get("sslmode") === "require" ||
    parsed.hostname.endsWith(".neon.tech");

  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  return {
    normalizedConnectionString: parsed.toString(),
    ...(sslRequested ? { ssl: { rejectUnauthorized: false } } : {})
  };
}
