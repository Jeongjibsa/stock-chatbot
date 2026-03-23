import { describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "./client.js";
import { TelegramRequestEventRepository } from "./telegram-request-event-repository.js";

function createDbDouble() {
  const state = {
    insertedRows: [
      {
        id: "event-1",
        telegramUserId: "1001",
        eventKind: "report_request"
      }
    ] as unknown[],
    countRows: [{ count: 2 }] as unknown[],
    listedRows: [{ id: "event-1" }] as unknown[],
    deletedRows: [{ id: "event-1" }] as unknown[]
  };

  const db = {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => state.insertedRows)
      }))
    })),
    select: vi.fn((selection?: unknown) => {
      const isCountQuery =
        selection !== undefined &&
        typeof selection === "object" &&
        selection !== null &&
        "count" in (selection as Record<string, unknown>);

      return {
        from: vi.fn(() => {
          if (isCountQuery) {
            return {
              where: vi.fn(async () => state.countRows)
            };
          }

          return {
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => state.listedRows)
              }))
            }))
          };
        })
      };
    }),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => state.deletedRows)
      }))
    }))
  } as unknown as DatabaseClient;

  return {
    db,
    state
  };
}

describe("TelegramRequestEventRepository", () => {
  it("inserts request events", async () => {
    const { db } = createDbDouble();
    const repository = new TelegramRequestEventRepository(db);

    await expect(
      repository.insert({
        telegramUserId: "1001",
        eventKind: "report_request"
      })
    ).resolves.toMatchObject({
      telegramUserId: "1001",
      eventKind: "report_request"
    });
  });

  it("returns zero when count query yields nothing", async () => {
    const { db, state } = createDbDouble();
    state.countRows = [];
    const repository = new TelegramRequestEventRepository(db);

    await expect(
      repository.countByTelegramUserIdSince("1001", new Date("2026-03-24T00:00:00.000Z"))
    ).resolves.toBe(0);
  });

  it("lists recent events", async () => {
    const { db } = createDbDouble();
    const repository = new TelegramRequestEventRepository(db);

    await expect(repository.listRecentByTelegramUserId("1001")).resolves.toHaveLength(1);
  });

  it("clears recent events for multiple users", async () => {
    const { db } = createDbDouble();
    const repository = new TelegramRequestEventRepository(db);

    await expect(
      repository.clearByTelegramUserIdsSince(
        ["1001", "1002"],
        new Date("2026-03-24T00:00:00.000Z")
      )
    ).resolves.toBe(1);
  });
});
