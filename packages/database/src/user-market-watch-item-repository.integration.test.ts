import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { DEFAULT_MARKET_WATCH_CATALOG } from "./default-market-watch-catalog.js";
import { MarketWatchCatalogRepository } from "./market-watch-catalog-repository.js";
import { runMigrations } from "./migrate.js";
import { UserRepository } from "./user-repository.js";
import { UserMarketWatchItemRepository } from "./user-market-watch-item-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("UserMarketWatchItemRepository integration", () => {
  let pool: Pool;
  let userRepository: UserRepository;
  let catalogRepository: MarketWatchCatalogRepository;
  let repository: UserMarketWatchItemRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);

    userRepository = new UserRepository(db);
    catalogRepository = new MarketWatchCatalogRepository(db);
    repository = new UserMarketWatchItemRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(
      sql.raw(
        'TRUNCATE TABLE "user_market_watch_items", "market_watch_catalog_items", "portfolio_holdings", "users" RESTART IDENTITY CASCADE;'
      )
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("merges default catalog with user custom items", async () => {
    await catalogRepository.seedDefaults();
    const user = await userRepository.upsert({
      telegramUserId: "3001",
      displayName: "Market Watch User"
    });

    await repository.addCustomItem({
      userId: user.id,
      itemCode: "SOX",
      itemName: "PHLX Semiconductor",
      assetType: "index",
      sourceKey: "index:NASDAQ:SOX"
    });

    const effective = await repository.listEffectiveByUserId(user.id);

    expect(effective).toHaveLength(DEFAULT_MARKET_WATCH_CATALOG.length + 1);
    expect(effective.at(-1)).toMatchObject({
      itemCode: "SOX",
      isDefault: false
    });
  });

  it("hides and restores default catalog items per user", async () => {
    await catalogRepository.seedDefaults();
    const user = await userRepository.upsert({
      telegramUserId: "3002",
      displayName: "Market Watch User"
    });

    await repository.hideDefaultItem(user.id, "VIX");
    const hidden = await repository.listEffectiveByUserId(user.id);
    await repository.showDefaultItem(user.id, "VIX");
    const restored = await repository.listEffectiveByUserId(user.id);

    expect(hidden.some((item) => item.itemCode === "VIX")).toBe(false);
    expect(restored.some((item) => item.itemCode === "VIX")).toBe(true);
  });

  it("removes custom items without touching default catalog items", async () => {
    await catalogRepository.seedDefaults();
    const user = await userRepository.upsert({
      telegramUserId: "3003",
      displayName: "Market Watch User"
    });

    await repository.addCustomItem({
      userId: user.id,
      itemCode: "SOX",
      itemName: "PHLX Semiconductor",
      assetType: "index",
      sourceKey: "index:NASDAQ:SOX"
    });

    const removed = await repository.removeCustomItem(user.id, "SOX");
    const effective = await repository.listEffectiveByUserId(user.id);

    expect(removed).toBe(true);
    expect(effective).toHaveLength(DEFAULT_MARKET_WATCH_CATALOG.length);
    expect(effective.some((item) => item.itemCode === "SOX")).toBe(false);
  });
});
