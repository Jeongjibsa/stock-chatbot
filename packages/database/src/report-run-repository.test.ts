import { describe, expect, it } from "vitest";

import type { DatabaseClient } from "./client.js";
import { ReportRunRepository } from "./report-run-repository.js";

function createDbDouble() {
  const state = {
    result: [] as unknown[]
  };

  const db = {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => state.result
        })
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => state.result
        })
      })
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => state.result,
          orderBy: async () => state.result
        })
      })
    })
  } as unknown as DatabaseClient;

  return { db, state };
}

describe("ReportRunRepository", () => {
  it("returns the created run on first start", async () => {
    const { db, state } = createDbDouble();
    state.result = [
      {
        id: "run-1",
        userId: "user-1",
        runDate: "2026-03-20",
        scheduleType: "daily-pre-market",
        status: "running"
      }
    ];
    const repository = new ReportRunRepository(db);

    await expect(
      repository.startRun({
        userId: "user-1",
        runDate: "2026-03-20",
        scheduleType: "daily-pre-market"
      })
    ).resolves.toMatchObject({
      created: true,
      run: {
        id: "run-1"
      }
    });
  });

  it("returns the existing run when a duplicate start occurs", async () => {
    const { db, state } = createDbDouble();
    state.result = [];
    const repository = new ReportRunRepository(db);

    const promise = repository.startRun({
      userId: "user-1",
      runDate: "2026-03-20",
      scheduleType: "daily-pre-market"
    });

    state.result = [
      {
        id: "run-1",
        userId: "user-1",
        runDate: "2026-03-20",
        scheduleType: "daily-pre-market",
        status: "completed"
      }
    ];

    await expect(promise).resolves.toMatchObject({
      created: false,
      run: {
        id: "run-1",
        status: "completed"
      }
    });
  });

  it("returns the completed run after update", async () => {
    const { db, state } = createDbDouble();
    state.result = [
      {
        id: "run-1",
        status: "partial_success"
      }
    ];
    const repository = new ReportRunRepository(db);

    await expect(
      repository.completeRun({
        id: "run-1",
        status: "partial_success",
        reportText: "rendered report"
      })
    ).resolves.toMatchObject({
      id: "run-1",
      status: "partial_success"
    });
  });
});
