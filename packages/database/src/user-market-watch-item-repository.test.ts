import { describe, expect, it } from "vitest";

import type { DatabaseClient } from "./client.js";
import { marketWatchCatalogItems } from "./schema.js";
import { UserMarketWatchItemRepository } from "./user-market-watch-item-repository.js";

function createDbDouble() {
  const state = {
    catalogResult: [] as unknown[],
    overrideResult: [] as unknown[],
    mutationResult: [] as unknown[]
  };

  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => {
          if (table === marketWatchCatalogItems) {
            return {
              limit: async () => state.catalogResult,
              orderBy: async () => state.catalogResult
            };
          }

          return {
            limit: async () => state.overrideResult,
            orderBy: async () => state.overrideResult
          };
        }
      })
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => state.mutationResult
        })
      })
    }),
    delete: () => ({
      where: () => ({
        returning: async () => state.mutationResult
      })
    })
  } as unknown as DatabaseClient;

  return { db, state };
}

describe("UserMarketWatchItemRepository", () => {
  it("returns default items plus active custom items for effective list", async () => {
    const { db, state } = createDbDouble();
    state.catalogResult = [
      {
        itemCode: "KOSPI",
        itemName: "코스피",
        assetType: "index",
        sourceKey: "index:KRX:KOSPI",
        sortOrder: 10,
        isDefault: true
      },
      {
        itemCode: "VIX",
        itemName: "VIX",
        assetType: "volatility",
        sourceKey: "index:CBOE:VIX",
        sortOrder: 100,
        isDefault: true
      }
    ];
    state.overrideResult = [
      {
        userId: "user-1",
        itemCode: "VIX",
        isActive: false,
        isCustom: false
      },
      {
        userId: "user-1",
        itemCode: "SOX",
        itemName: "PHLX Semiconductor",
        assetType: "index",
        sourceKey: "index:NASDAQ:SOX",
        isActive: true,
        isCustom: true
      }
    ];
    const repository = new UserMarketWatchItemRepository(db);

    await expect(repository.listEffectiveByUserId("user-1")).resolves.toMatchObject([
      {
        itemCode: "KOSPI",
        isDefault: true
      },
      {
        itemCode: "SOX",
        isDefault: false
      }
    ]);
  });

  it("rejects custom items that collide with the default catalog", async () => {
    const { db, state } = createDbDouble();
    state.catalogResult = [
      {
        itemCode: "KOSPI",
        itemName: "코스피"
      }
    ];
    const repository = new UserMarketWatchItemRepository(db);

    await expect(
      repository.addCustomItem({
        userId: "user-1",
        itemCode: "KOSPI",
        itemName: "코스피",
        assetType: "index",
        sourceKey: "index:KRX:KOSPI"
      })
    ).rejects.toThrow("default catalog");
  });

  it("returns true when a custom item is removed", async () => {
    const { db, state } = createDbDouble();
    state.mutationResult = [{ id: "custom-1" }];
    const repository = new UserMarketWatchItemRepository(db);

    await expect(repository.removeCustomItem("user-1", "SOX")).resolves.toBe(true);
  });
});
