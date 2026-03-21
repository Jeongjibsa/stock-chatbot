import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { UserRepository } from "./user-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("UserRepository integration", () => {
  let pool: Pool;
  let repository: UserRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);

    repository = new UserRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(sql.raw('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;'));
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates a new user", async () => {
    const user = await repository.upsert({
      telegramUserId: "1001",
      displayName: "Jisung",
      preferredDeliveryChatId: "chat-1001",
      preferredDeliveryChatType: "private"
    });

    expect(user.telegramUserId).toBe("1001");
    expect(user.locale).toBe("ko-KR");
    expect(user.preferredDeliveryChatId).toBe("chat-1001");
  });

  it("updates an existing user without duplicating telegram id", async () => {
    await repository.upsert({
      telegramUserId: "1001",
      displayName: "Old Name"
    });

    const updated = await repository.upsert({
      telegramUserId: "1001",
      displayName: "New Name",
      locale: "en-US",
      timezone: "UTC",
      preferredDeliveryChatId: "chat-2002",
      preferredDeliveryChatType: "private"
    });
    const users = await repository.listUsers();

    expect(updated.displayName).toBe("New Name");
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      telegramUserId: "1001",
      displayName: "New Name",
      locale: "en-US",
      timezone: "UTC",
      preferredDeliveryChatId: "chat-2002",
      preferredDeliveryChatType: "private"
    });
  });
});
