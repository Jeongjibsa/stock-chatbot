import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { ReportRunRepository } from "./report-run-repository.js";
import { StrategySnapshotRepository } from "./strategy-snapshot-repository.js";
import { UserRepository } from "./user-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("StrategySnapshotRepository integration", () => {
  let pool: Pool;
  let userRepository: UserRepository;
  let reportRunRepository: ReportRunRepository;
  let repository: StrategySnapshotRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);

    userRepository = new UserRepository(db);
    reportRunRepository = new ReportRunRepository(db);
    repository = new StrategySnapshotRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(
      sql.raw(
        'TRUNCATE TABLE "strategy_snapshots", "report_runs", "user_market_watch_items", "market_watch_catalog_items", "portfolio_holdings", "users" RESTART IDENTITY CASCADE;'
      )
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("inserts and lists recent strategy snapshots", async () => {
    const user = await userRepository.upsert({
      telegramUserId: "4901",
      displayName: "Strategy User"
    });
    const run = await reportRunRepository.startRun({
      userId: user.id,
      runDate: "2026-03-21",
      scheduleType: "daily-pre-market"
    });

    const inserted = await repository.insertMany([
      {
        reportRunId: run.run.id,
        userId: user.id,
        runDate: "2026-03-21",
        scheduleType: "daily-pre-market",
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
    ]);

    const listed = await repository.listRecent();
    const byRun = await repository.listByReportRunId(run.run.id);

    expect(inserted).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: inserted[0]?.id,
      companyName: "삼성전자",
      symbol: "005930"
    });
    expect(byRun).toHaveLength(1);
    expect(byRun[0]?.action).toBe("HOLD");
  });
});
