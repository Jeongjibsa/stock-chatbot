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
        preferredDeliveryChatId: "chat-1",
        preferredDeliveryChatType: "private",
        displayName: "Jisung",
        locale: "ko-KR",
        timezone: "Asia/Seoul",
        dailyReportEnabled: true,
        dailyReportHour: 9,
        dailyReportMinute: 0
      }
    ];
    const repository = new UserRepository(db);

    await expect(
      repository.upsert({
        telegramUserId: "123",
        displayName: "Jisung",
        preferredDeliveryChatId: "chat-1",
        preferredDeliveryChatType: "private"
      })
    ).resolves.toMatchObject({
      telegramUserId: "123",
      preferredDeliveryChatId: "chat-1",
      preferredDeliveryChatType: "private",
      displayName: "Jisung"
    });
  });

  it("returns the updated user from report settings update", async () => {
    const state = {
      result: [
        {
          telegramUserId: "123",
          dailyReportEnabled: false,
          dailyReportHour: 21,
          dailyReportMinute: 15
        }
      ] as unknown[]
    };
    const db = {
      update: () => ({
        set: () => ({
          where: () => ({
            returning: async () => state.result
          })
        })
      })
    } as unknown as DatabaseClient;
    const repository = new UserRepository(db);

    await expect(
      repository.updateReportSettings({
        telegramUserId: "123",
        dailyReportEnabled: false,
        dailyReportHour: 21,
        dailyReportMinute: 15
      })
    ).resolves.toMatchObject({
      telegramUserId: "123",
      dailyReportEnabled: false,
      dailyReportHour: 21,
      dailyReportMinute: 15
    });
  });
});
