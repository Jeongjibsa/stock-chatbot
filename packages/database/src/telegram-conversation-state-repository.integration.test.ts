import { beforeAll, describe, expect, it } from "vitest";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { TelegramConversationStateRepository } from "./telegram-conversation-state-repository.js";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";

describe("TelegramConversationStateRepository integration", () => {
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);
  const repository = new TelegramConversationStateRepository(db);

  beforeAll(async () => {
    await runMigrations(db);
  });

  it("stores, reads, and clears conversation state", async () => {
    await repository.clear("integration-telegram-user");

    await repository.upsert({
      telegramUserId: "integration-telegram-user",
      state: {
        command: "portfolio_add",
        step: "awaiting_avg_price_choice"
      }
    });

    const stored = await repository.getByTelegramUserId("integration-telegram-user");
    expect(stored?.state).toEqual({
      command: "portfolio_add",
      step: "awaiting_avg_price_choice"
    });

    await repository.clear("integration-telegram-user");

    const cleared = await repository.getByTelegramUserId("integration-telegram-user");
    expect(cleared).toBeNull();
  });
});
