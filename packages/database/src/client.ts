import { Pool } from "pg";

import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema.js";

export function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString
  });
}

export function createDatabase(pool: Pool) {
  return drizzle(pool, { schema });
}

export type DatabaseClient = ReturnType<typeof createDatabase>;

