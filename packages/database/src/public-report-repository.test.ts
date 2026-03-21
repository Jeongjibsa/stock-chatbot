import { describe, expect, it } from "vitest";

import type { DatabaseClient } from "./client.js";
import { PublicReportRepository } from "./public-report-repository.js";

function createDbDouble() {
  const state = {
    result: [] as unknown[]
  };

  const db = {
    insert: () => ({
      values: () => ({
        returning: async () => state.result
      })
    }),
    select: () => ({
      from: () => ({
        orderBy: async () => state.result,
        where: () => ({
          limit: async () => state.result,
          orderBy: () => ({
            limit: async () => state.result
          })
        })
      })
    })
  } as unknown as DatabaseClient;

  return { db, state };
}

describe("PublicReportRepository", () => {
  it("returns the inserted public report", async () => {
    const { db, state } = createDbDouble();
    state.result = [
      {
        id: "report-1",
        reportDate: "2026-03-21",
        summary: "요약",
        marketRegime: "Risk-Off",
        totalScore: "-0.42",
        signals: ["VIX 급등", "달러 강세"],
        contentMarkdown: "# 보고서"
      }
    ];
    const repository = new PublicReportRepository(db);

    await expect(
      repository.insertReport({
        reportDate: "2026-03-21",
        summary: "요약",
        marketRegime: "Risk-Off",
        totalScore: "-0.42",
        signals: ["VIX 급등", "달러 강세"],
        contentMarkdown: "# 보고서"
      })
    ).resolves.toMatchObject({
      id: "report-1",
      marketRegime: "Risk-Off"
    });
  });

  it("lists reports in repository order", async () => {
    const { db, state } = createDbDouble();
    state.result = [
      { id: "report-2", reportDate: "2026-03-22" },
      { id: "report-1", reportDate: "2026-03-21" }
    ];
    const repository = new PublicReportRepository(db);

    await expect(repository.listReports()).resolves.toMatchObject([
      { id: "report-2" },
      { id: "report-1" }
    ]);
  });

  it("returns null when a report is missing", async () => {
    const { db, state } = createDbDouble();
    state.result = [];
    const repository = new PublicReportRepository(db);

    await expect(repository.getReportById("missing")).resolves.toBeNull();
  });

  it("returns the latest report for a date", async () => {
    const { db, state } = createDbDouble();
    state.result = [
      {
        id: "report-latest",
        reportDate: "2026-03-21"
      }
    ];
    const repository = new PublicReportRepository(db);

    await expect(repository.findLatestByReportDate("2026-03-21")).resolves.toMatchObject({
      id: "report-latest"
    });
  });
});
