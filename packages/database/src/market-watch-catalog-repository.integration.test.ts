import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { DEFAULT_MARKET_WATCH_CATALOG } from "./default-market-watch-catalog.js";
import { runMigrations } from "./migrate.js";
import { MarketWatchCatalogRepository } from "./market-watch-catalog-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("MarketWatchCatalogRepository integration", () => {
  let pool: Pool;
  let repository: MarketWatchCatalogRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);

    repository = new MarketWatchCatalogRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(
      sql.raw(
        'TRUNCATE TABLE "market_watch_catalog_items", "portfolio_holdings", "users" RESTART IDENTITY CASCADE;'
      )
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("seeds the default market watch catalog", async () => {
    const seeded = await repository.seedDefaults();

    expect(seeded).toHaveLength(DEFAULT_MARKET_WATCH_CATALOG.length);
    expect(seeded[0]).toMatchObject({
      itemCode: "KOSPI",
      itemName: "코스피"
    });
    expect(seeded.at(-1)).toMatchObject({
      itemCode: "VIX",
      itemName: "VIX"
    });
  });

  it("does not duplicate rows when seeded twice", async () => {
    await repository.seedDefaults();
    const reseeded = await repository.seedDefaults();

    expect(reseeded).toHaveLength(DEFAULT_MARKET_WATCH_CATALOG.length);
    expect(reseeded.map((item) => item.itemCode)).toEqual(
      DEFAULT_MARKET_WATCH_CATALOG.map((item) => item.itemCode)
    );
  });
});
