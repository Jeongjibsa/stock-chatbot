import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";

export async function runMigrations(db: DatabaseClient): Promise<void> {
  const migrationPath = resolve(process.cwd(), "packages/database/drizzle/0000_init.sql");
  const migrationSql = await readFile(migrationPath, "utf8");

  await db.execute(sql.raw(migrationSql));
}

