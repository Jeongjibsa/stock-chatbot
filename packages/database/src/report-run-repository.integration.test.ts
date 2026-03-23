import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { ReportRunRepository } from "./report-run-repository.js";
import { UserRepository } from "./user-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("ReportRunRepository integration", () => {
  let pool: Pool;
  let userRepository: UserRepository;
  let repository: ReportRunRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);

    userRepository = new UserRepository(db);
    repository = new ReportRunRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(
      sql.raw(
        'TRUNCATE TABLE "report_runs", "user_market_watch_items", "market_watch_catalog_items", "portfolio_holdings", "users" RESTART IDENTITY CASCADE;'
      )
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("deduplicates the same user/date/schedule combination", async () => {
    const user = await userRepository.upsert({
      telegramUserId: "4001",
      displayName: "Report User"
    });

    const first = await repository.startRun({
      userId: user.id,
      runDate: "2026-03-20",
      scheduleType: "daily-pre-market"
    });
    const second = await repository.startRun({
      userId: user.id,
      runDate: "2026-03-20",
      scheduleType: "daily-pre-market"
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.run.id).toBe(first.run.id);
  });

  it("stores the final report status and text", async () => {
    const user = await userRepository.upsert({
      telegramUserId: "4002",
      displayName: "Report User"
    });
    const run = await repository.startRun({
      userId: user.id,
      runDate: "2026-03-20",
      scheduleType: "daily-pre-market"
    });

    const completed = await repository.completeRun({
      id: run.run.id,
      status: "partial_success",
      reportText: "rendered report",
      errorMessage: "one item unsupported"
    });

    expect(completed.status).toBe("partial_success");
    expect(completed.reportText).toBe("rendered report");
    expect(completed.errorMessage).toBe("one item unsupported");
    expect(completed.completedAt).not.toBeNull();
  });

  it("restarts a stale running report instead of blocking the day", async () => {
    const user = await userRepository.upsert({
      telegramUserId: "4003",
      displayName: "Stale Report User"
    });
    const first = await repository.startRun({
      userId: user.id,
      runDate: "2026-03-20",
      scheduleType: "telegram-report"
    });
    const db = createDatabase(pool);

    await db.execute(
      sql.raw(
        `update "report_runs"
         set "started_at" = now() - interval '10 minutes'
         where "id" = '${first.run.id}'`
      )
    );

    const restarted = await repository.startRun({
      userId: user.id,
      runDate: "2026-03-20",
      scheduleType: "telegram-report"
    });

    expect(restarted.created).toBe(true);
    expect(restarted.run.id).toBe(first.run.id);
    expect(restarted.run.status).toBe("running");
    expect(restarted.run.completedAt).toBeNull();
    expect(restarted.run.errorMessage).toBeNull();
  });

  it("restarts a failed report without text for the same user/date/schedule", async () => {
    const user = await userRepository.upsert({
      telegramUserId: "4004",
      displayName: "Retry Report User"
    });
    const first = await repository.startRun({
      userId: user.id,
      runDate: "2026-03-20",
      scheduleType: "telegram-report"
    });

    await repository.completeRun({
      id: first.run.id,
      status: "failed",
      errorMessage: "upstream timeout"
    });

    const restarted = await repository.startRun({
      userId: user.id,
      runDate: "2026-03-20",
      scheduleType: "telegram-report"
    });

    expect(restarted.created).toBe(true);
    expect(restarted.run.id).toBe(first.run.id);
    expect(restarted.run.status).toBe("running");
    expect(restarted.run.reportText).toBeNull();
    expect(restarted.run.errorMessage).toBeNull();
  });

  it("deletes runs for selected users after a timestamp", async () => {
    const user = await userRepository.upsert({
      telegramUserId: "4005",
      displayName: "Cleanup Report User"
    });

    await repository.startRun({
      userId: user.id,
      runDate: "2026-03-20",
      scheduleType: "telegram-report"
    });

    const deleted = await repository.deleteByUserIdsSince(
      [user.id],
      new Date("2000-01-01T00:00:00.000Z")
    );
    const remaining = await repository.listRecentByUserId(user.id);

    expect(deleted).toBe(1);
    expect(remaining).toHaveLength(0);
  });
});
