import { describe, expect, it } from "vitest";

import type { DatabaseClient } from "./client.js";
import { UserRepository } from "./user-repository.js";

function createDbDouble() {
  const state = {
    result: [{ telegramUserId: "1" }] as unknown[]
  };

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => state.result
        }),
        orderBy: async () => state.result
      })
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => state.result
        })
      })
    })
  } as unknown as DatabaseClient;

  return { db, state };
}

describe("UserRepository", () => {
  it("returns null when a user is missing", async () => {
    const { db, state } = createDbDouble();
    state.result = [];
    const repository = new UserRepository(db);

    await expect(repository.getByTelegramUserId("missing")).resolves.toBeNull();
  });

  it("returns the inserted user from upsert", async () => {
    const { db, state } = createDbDouble();
    state.result = [
      {
        telegramUserId: "123",
        displayName: "Jisung",
        locale: "ko-KR",
        timezone: "Asia/Seoul"
      }
    ];
    const repository = new UserRepository(db);

    await expect(
      repository.upsert({
        telegramUserId: "123",
        displayName: "Jisung"
      })
    ).resolves.toMatchObject({
      telegramUserId: "123",
      displayName: "Jisung"
    });
  });
});
