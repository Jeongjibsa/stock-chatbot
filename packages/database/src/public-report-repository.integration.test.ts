import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, createPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import { PublicReportRepository } from "./public-report-repository.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describeIntegration("PublicReportRepository integration", () => {
  let pool: Pool;
  let repository: PublicReportRepository;

  beforeAll(async () => {
    pool = createPool(connectionString);
    const db = createDatabase(pool);

    await runMigrations(db);

    repository = new PublicReportRepository(db);
  });

  beforeEach(async () => {
    const db = createDatabase(pool);
    await db.execute(sql.raw('TRUNCATE TABLE "reports" RESTART IDENTITY CASCADE;'));
  });

  afterAll(async () => {
    await pool.end();
  });

  it("inserts, lists, and fetches public reports", async () => {
    const created = await repository.insertReport({
      briefingSession: "pre_market",
      reportDate: "2026-03-21",
      summary: "달러 강세와 변동성 확대가 겹친 하루입니다.",
      marketRegime: "Risk-Off",
      totalScore: "-0.42",
      signals: ["VIX 급등", "달러 강세"],
      indicatorTags: ["KOSPI +0.31%", "NASDAQ -2.01%"],
      contentMarkdown: "# 오늘의 브리핑"
    });

    const listed = await repository.listReports();
    const fetched = await repository.getReportById(created.id);

    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: created.id,
      marketRegime: "Risk-Off"
    });
    expect(fetched).toMatchObject({
      id: created.id,
      reportDate: "2026-03-21",
      signals: ["VIX 급등", "달러 강세"],
      indicatorTags: ["KOSPI +0.31%", "NASDAQ -2.01%"]
    });
  });
});
