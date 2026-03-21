import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { TickerMasterRepository } from "./ticker-master-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("TickerMasterRepository integration", () => {
  let pool: Pool;
  let repository: TickerMasterRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);

    repository = new TickerMasterRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);

    await db.execute(sql.raw('TRUNCATE TABLE "ticker_masters" RESTART IDENTITY CASCADE;'));

    await repository.upsertMany([
      {
        symbol: "005930",
        market: "KOSPI",
        nameEn: "SamsungElectronics",
        nameKr: "삼성전자보통주",
        normalizedSymbol: "005930",
        normalizedNameEn: "samsungelectronics",
        normalizedNameKr: "삼성전자"
      },
      {
        symbol: "006400",
        market: "KOSPI",
        nameEn: "SamsungSDI",
        nameKr: "삼성SDI보통주",
        normalizedSymbol: "006400",
        normalizedNameEn: "samsungsdi",
        normalizedNameKr: "삼성sdi"
      },
      {
        symbol: "TSLA",
        market: "NASDAQ",
        nameEn: "TeslaInc",
        nameKr: "",
        normalizedSymbol: "tsla",
        normalizedNameEn: "tesla",
        normalizedNameKr: ""
      }
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("stores and counts ticker masters", async () => {
    await expect(repository.count()).resolves.toBe(3);
  });

  it("finds exact, prefix, partial, and fuzzy candidates", async () => {
    const exact = await repository.findExactSymbol("005930");
    const prefix = await repository.findPrefixMatches("samsung");
    const partial = await repository.findPartialMatches("tesl");
    const fuzzy = await repository.findFuzzyMatches("삼전");

    expect(exact).toHaveLength(1);
    expect(exact[0]?.symbol).toBe("005930");
    expect(prefix.map((item) => item.symbol)).toContain("005930");
    expect(prefix.map((item) => item.symbol)).toContain("006400");
    expect(partial[0]?.symbol).toBe("TSLA");
    expect(fuzzy.map((item) => item.symbol)).toContain("005930");
  });
});
