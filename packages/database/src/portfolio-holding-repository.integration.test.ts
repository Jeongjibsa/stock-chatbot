import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { PortfolioHoldingRepository } from "./portfolio-holding-repository.js";
import { UserRepository } from "./user-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("PortfolioHoldingRepository integration", () => {
  let pool: Pool;
  let userRepository: UserRepository;
  let holdingRepository: PortfolioHoldingRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);

    userRepository = new UserRepository(db);
    holdingRepository = new PortfolioHoldingRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(
      sql.raw(
        'TRUNCATE TABLE "portfolio_holdings", "users" RESTART IDENTITY CASCADE;'
      )
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates and lists holdings for a user", async () => {
    const user = await userRepository.upsert({
      telegramUserId: "2001",
      displayName: "Portfolio Owner"
    });

    await holdingRepository.upsert({
      userId: user.id,
      symbol: "005930",
      exchange: "KR",
      companyName: "Samsung Electronics",
      quantity: "10",
      avgPrice: "72000"
    });

    const holdings = await holdingRepository.listByUserId(user.id);

    expect(holdings).toHaveLength(1);
    expect(holdings[0]).toMatchObject({
      userId: user.id,
      symbol: "005930",
      exchange: "KR",
      companyName: "Samsung Electronics"
    });
  });

  it("updates and removes a holding without duplication", async () => {
    const user = await userRepository.upsert({
      telegramUserId: "2002",
      displayName: "Portfolio Owner"
    });

    await holdingRepository.upsert({
      userId: user.id,
      symbol: "AAPL",
      exchange: "US",
      companyName: "Apple Inc.",
      quantity: "2"
    });

    const updated = await holdingRepository.upsert({
      userId: user.id,
      symbol: "AAPL",
      exchange: "US",
      companyName: "Apple Inc.",
      quantity: "5",
      note: "Long term"
    });
    const holdings = await holdingRepository.listByUserId(user.id);
    const removed = await holdingRepository.remove(user.id, "AAPL", "US");
    const remaining = await holdingRepository.listByUserId(user.id);

    expect(updated.quantity).toBe("5");
    expect(holdings).toHaveLength(1);
    expect(holdings[0]?.note).toBe("Long term");
    expect(removed).toBe(true);
    expect(remaining).toHaveLength(0);
  });
});

