import { describe, expect, it } from "vitest";

import type { DatabaseClient } from "./client.js";
import { MarketWatchCatalogRepository } from "./market-watch-catalog-repository.js";

function createDbDouble() {
  const state = {
    result: [] as unknown[]
  };

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: async () => state.result
        })
      })
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: async () => state.result
      })
    })
  } as unknown as DatabaseClient;

  return { db, state };
}

describe("MarketWatchCatalogRepository", () => {
  it("returns an empty list when the catalog is not seeded", async () => {
    const { db } = createDbDouble();
    const repository = new MarketWatchCatalogRepository(db);

    await expect(repository.listDefaults()).resolves.toEqual([]);
  });

  it("returns the seeded default catalog in list form", async () => {
    const { db, state } = createDbDouble();
    state.result = [
      {
        itemCode: "KOSPI",
        itemName: "코스피",
        assetType: "index",
        sourceKey: "index:KRX:KOSPI",
        sortOrder: 10,
        isDefault: true
      }
    ];
    const repository = new MarketWatchCatalogRepository(db);

    await expect(repository.seedDefaults()).resolves.toMatchObject([
      {
        itemCode: "KOSPI",
        itemName: "코스피"
      }
    ]);
  });
});
