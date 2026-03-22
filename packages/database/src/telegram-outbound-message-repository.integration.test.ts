import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { TelegramOutboundMessageRepository } from "./telegram-outbound-message-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("TelegramOutboundMessageRepository integration", () => {
  let pool: Pool;
  let repository: TelegramOutboundMessageRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);
    repository = new TelegramOutboundMessageRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(
      sql.raw('TRUNCATE TABLE "telegram_outbound_messages" RESTART IDENTITY;')
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("records, lists, counts, and clears outbound messages by chat and time", async () => {
    const before = new Date("2026-03-22T00:00:00.000Z");

    await repository.insert({
      chatId: "1001",
      telegramMessageId: "m-1",
      text: "hello"
    });
    await repository.insert({
      chatId: "1001",
      telegramMessageId: "m-2",
      text: "world"
    });

    const listed = await repository.listByChatId("1001", {
      since: new Date("2000-01-01T00:00:00.000Z")
    });
    expect(listed).toHaveLength(2);
    expect(listed.map((row) => row.text)).toEqual(["hello", "world"]);

    await expect(repository.countByChatIdSince("1001", before)).resolves.toBe(2);

    await expect(
      repository.clearByChatIdsSince(["1001"], new Date("2000-01-01T00:00:00.000Z"))
    ).resolves.toBe(2);
    await expect(repository.listByChatId("1001")).resolves.toEqual([]);
  });
});
