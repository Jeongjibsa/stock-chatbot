import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { TelegramRequestEventRepository } from "./telegram-request-event-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("TelegramRequestEventRepository integration", () => {
  let pool: Pool;
  let repository: TelegramRequestEventRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);

    repository = new TelegramRequestEventRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(
      sql.raw('TRUNCATE TABLE "telegram_request_events" RESTART IDENTITY CASCADE;')
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("stores and counts recent request events", async () => {
    await repository.insert({
      telegramUserId: "1001",
      eventKind: "inbound",
      createdAt: new Date("2026-03-24T00:00:05.000Z")
    });
    await repository.insert({
      telegramUserId: "1001",
      eventKind: "report_request",
      createdAt: new Date("2026-03-24T00:00:10.000Z")
    });

    const count = await repository.countByTelegramUserIdSince(
      "1001",
      new Date("2026-03-24T00:00:00.000Z"),
      ["report_request"]
    );
    const listed = await repository.listRecentByTelegramUserId("1001");

    expect(count).toBe(1);
    expect(listed).toHaveLength(2);
    expect(listed[0]?.eventKind).toBe("report_request");
  });
});
