import { describe, expect, it, vi } from "vitest";

import { TelegramProcessedUpdateRepository } from "./telegram-processed-update-repository.js";

describe("TelegramProcessedUpdateRepository", () => {
  it("returns true when a new update id is recorded", async () => {
    const values = vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ updateId: "12345" }])
      })
    });
    const db = {
      insert: vi.fn().mockReturnValue({
        values
      })
    };
    const repository = new TelegramProcessedUpdateRepository(db as never);

    await expect(repository.markProcessed("12345")).resolves.toBe(true);
    expect(values).toHaveBeenCalledWith({
      updateId: "12345"
    });
  });

  it("returns false when the update id already exists", async () => {
    const repository = new TelegramProcessedUpdateRepository({
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([])
          })
        })
      })
    } as never);

    await expect(repository.markProcessed("12345")).resolves.toBe(false);
  });
});
