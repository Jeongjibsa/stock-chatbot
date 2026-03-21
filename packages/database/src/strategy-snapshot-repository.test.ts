import { describe, expect, it } from "vitest";

import type { DatabaseClient } from "./client.js";
import { StrategySnapshotRepository } from "./strategy-snapshot-repository.js";

function createDbDouble() {
  const state = {
    result: [] as unknown[]
  };

  const db = {
    insert: () => ({
      values: () => ({
        returning: async () => state.result
      })
    }),
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async () => state.result
        }),
        where: () => ({
          orderBy: async () => state.result
        })
      })
    })
  } as unknown as DatabaseClient;

  return { db, state };
}

describe("StrategySnapshotRepository", () => {
  it("returns inserted strategy snapshots", async () => {
    const { db, state } = createDbDouble();
    state.result = [
      {
        id: "snapshot-1",
        reportRunId: "run-1",
        companyName: "삼성전자",
        action: "HOLD"
      }
    ];
    const repository = new StrategySnapshotRepository(db);

    await expect(
      repository.insertMany([
        {
          reportRunId: "run-1",
          userId: "user-1",
          runDate: "2026-03-21",
          scheduleType: "daily",
          companyName: "삼성전자",
          exchange: "KR",
          symbol: "005930",
          action: "HOLD",
          actionSummary: "보수적으로 유지하시는 편이 좋습니다.",
          macroScore: "-0.25",
          trendScore: "0.10",
          eventScore: "0.00",
          flowScore: "-0.10",
          totalScore: "-0.09"
        }
      ])
    ).resolves.toMatchObject([
      {
        id: "snapshot-1",
        companyName: "삼성전자"
      }
    ]);
  });

  it("returns recent strategy snapshots in repository order", async () => {
    const { db, state } = createDbDouble();
    state.result = [{ id: "snapshot-2" }, { id: "snapshot-1" }];
    const repository = new StrategySnapshotRepository(db);

    await expect(repository.listRecent()).resolves.toMatchObject([
      { id: "snapshot-2" },
      { id: "snapshot-1" }
    ]);
  });

  it("returns an empty array without touching the database when input is empty", async () => {
    const { db } = createDbDouble();
    const repository = new StrategySnapshotRepository(db);

    await expect(repository.insertMany([])).resolves.toEqual([]);
  });
});
