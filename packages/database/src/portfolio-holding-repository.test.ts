import { describe, expect, it } from "vitest";

import type { DatabaseClient } from "./client.js";
import { PortfolioHoldingRepository } from "./portfolio-holding-repository.js";

function createDbDouble() {
  const state = {
    result: [] as unknown[]
  };

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => state.result,
          orderBy: async () => state.result
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
    }),
    delete: () => ({
      where: () => ({
        returning: async () => state.result
      })
    })
  } as unknown as DatabaseClient;

  return { db, state };
}

describe("PortfolioHoldingRepository", () => {
  it("returns an empty list when user has no holdings", async () => {
    const { db } = createDbDouble();
    const repository = new PortfolioHoldingRepository(db);

    await expect(repository.listByUserId("user-1")).resolves.toEqual([]);
  });

  it("returns the upserted holding", async () => {
    const { db, state } = createDbDouble();
    state.result = [
      {
        userId: "user-1",
        symbol: "AAPL",
        exchange: "US",
        companyName: "Apple Inc."
      }
    ];
    const repository = new PortfolioHoldingRepository(db);

    await expect(
      repository.upsert({
        userId: "user-1",
        symbol: "AAPL",
        exchange: "US",
        companyName: "Apple Inc."
      })
    ).resolves.toMatchObject({
      symbol: "AAPL",
      exchange: "US"
    });
  });

  it("returns true when a holding is removed", async () => {
    const { db, state } = createDbDouble();
    state.result = [{ id: "holding-1" }];
    const repository = new PortfolioHoldingRepository(db);

    await expect(
      repository.remove("user-1", "AAPL", "US")
    ).resolves.toBe(true);
  });
});
