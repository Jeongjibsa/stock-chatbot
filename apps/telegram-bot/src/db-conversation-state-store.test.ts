import { describe, expect, it, vi } from "vitest";

import { DbConversationStateStore } from "./db-conversation-state-store.js";

describe("DbConversationStateStore", () => {
  it("reads stored state", async () => {
    const store = new DbConversationStateStore({
      clear: vi.fn(),
      getByTelegramUserId: vi.fn(async () => ({
        telegramUserId: "1001",
        state: {
          command: "market_add",
          step: "awaiting_query",
          draft: {}
        }
      })),
      upsert: vi.fn()
    } as never);

    const state = await store.get("1001");

    expect(state?.command).toBe("market_add");
  });

  it("writes state through repository", async () => {
    const repository = {
      clear: vi.fn(),
      getByTelegramUserId: vi.fn(),
      upsert: vi.fn(async () => undefined)
    };
    const store = new DbConversationStateStore(repository as never);

    await store.set("1001", {
      command: "portfolio_remove",
      step: "awaiting_ticker",
      draft: {}
    });

    expect(repository.upsert).toHaveBeenCalled();
  });
});
