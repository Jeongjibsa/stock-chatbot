import { describe, expect, it, vi } from "vitest";

import { TelegramConversationStateRepository } from "./telegram-conversation-state-repository.js";

describe("TelegramConversationStateRepository", () => {
  it("reads conversation state by telegram user id", async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          telegramUserId: "1001",
          state: {
            command: "market_add"
          }
        }
      ])
    };
    const repository = new TelegramConversationStateRepository({
      select: vi.fn(() => selectChain)
    } as never);

    const result = await repository.getByTelegramUserId("1001");

    expect(result?.telegramUserId).toBe("1001");
  });

  it("upserts conversation state", async () => {
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          telegramUserId: "1001",
          state: {
            command: "portfolio_add"
          }
        }
      ])
    };
    const repository = new TelegramConversationStateRepository({
      insert: vi.fn(() => insertChain)
    } as never);

    const result = await repository.upsert({
      telegramUserId: "1001",
      state: {
        command: "portfolio_add"
      }
    });

    expect(result.telegramUserId).toBe("1001");
  });

  it("clears conversation state", async () => {
    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined)
    };
    const repository = new TelegramConversationStateRepository({
      delete: vi.fn(() => deleteChain)
    } as never);

    await repository.clear("1001");

    expect(deleteChain.where).toHaveBeenCalled();
  });
});
