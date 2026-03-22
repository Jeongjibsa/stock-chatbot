import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { TelegramProcessedUpdateRepository } from "./telegram-processed-update-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("TelegramProcessedUpdateRepository integration", () => {
  let pool: Pool;
  let repository: TelegramProcessedUpdateRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);
    repository = new TelegramProcessedUpdateRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(sql.raw('TRUNCATE TABLE "telegram_processed_updates" RESTART IDENTITY;'));
  });

  afterAll(async () => {
    await pool.end();
  });

  it("records an update id once and rejects duplicates", async () => {
    const updateId = `update-${Date.now()}`;

    await expect(repository.markProcessed(updateId)).resolves.toBe(true);
    await expect(repository.markProcessed(updateId)).resolves.toBe(false);

    const record = await repository.getByUpdateId(updateId);

    expect(record?.updateId).toBe(updateId);
  });

  it("deletes processed updates by prefix", async () => {
    await repository.markProcessed("e2e-1");
    await repository.markProcessed("e2e-2");
    await repository.markProcessed("other-1");

    await expect(repository.deleteByPrefix("e2e-")).resolves.toBe(2);
    await expect(repository.getByUpdateId("e2e-1")).resolves.toBeNull();
    await expect(repository.getByUpdateId("other-1")).resolves.toEqual(
      expect.objectContaining({
        updateId: "other-1"
      })
    );
  });

  it("deletes processed updates by explicit ids", async () => {
    await repository.markProcessed("e2e-delete-1");
    await repository.markProcessed("e2e-delete-2");
    await repository.markProcessed("e2e-keep-1");

    await expect(
      repository.deleteByIds(["e2e-delete-1", "e2e-delete-2"])
    ).resolves.toBe(2);
    await expect(repository.getByUpdateId("e2e-delete-1")).resolves.toBeNull();
    await expect(repository.getByUpdateId("e2e-keep-1")).resolves.toEqual(
      expect.objectContaining({
        updateId: "e2e-keep-1"
      })
    );
  });
});
