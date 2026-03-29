import { describe, expect, it } from "vitest";

import type { DatabaseClient } from "./client.js";
import { PublicReportRepository } from "./public-report-repository.js";

function createDbDouble() {
  const state = {
    insertResult: [] as unknown[],
    selectResult: [] as unknown[],
    updateResult: [] as unknown[]
  };

  const db = {
    insert: () => ({
      values: () => ({
        returning: async () => state.insertResult
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => state.updateResult
        })
      })
    }),
    select: () => ({
      from: () => ({
        orderBy: async () => state.selectResult,
        where: () => ({
          limit: async () => state.selectResult,
          orderBy: () => ({
            limit: async () => state.selectResult
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
    state.selectResult = [];
    state.insertResult = [
      {
        id: "report-1",
        reportDate: "2026-03-21",
        summary: "요약",
        marketRegime: "Risk-Off",
        totalScore: "-0.42",
        signals: ["VIX 급등", "달러 강세"],
        indicatorTags: ["KOSPI +0.31%"],
        newsReferences: [],
        contentMarkdown: "# 보고서"
      }
    ];
    const repository = new PublicReportRepository(db);

    await expect(
      repository.insertReport({
        briefingSession: "pre_market",
        reportDate: "2026-03-21",
        summary: "요약",
        marketRegime: "Risk-Off",
        totalScore: "-0.42",
        signals: ["VIX 급등", "달러 강세"],
        indicatorTags: ["KOSPI +0.31%"],
        newsReferences: [],
        contentMarkdown: "# 보고서"
      })
    ).resolves.toMatchObject({
      id: "report-1",
      marketRegime: "Risk-Off"
    });
  });

  it("lists reports in repository order", async () => {
    const { db, state } = createDbDouble();
    state.selectResult = [
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
    state.selectResult = [];
    const repository = new PublicReportRepository(db);

    await expect(repository.getReportById("missing")).resolves.toBeNull();
  });

  it("returns the latest report for a date", async () => {
    const { db, state } = createDbDouble();
    state.selectResult = [
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

  it("returns the latest previous report for the same session", async () => {
    const { db, state } = createDbDouble();
    state.selectResult = [
      {
        id: "report-prior",
        reportDate: "2026-03-20",
        briefingSession: "pre_market"
      }
    ];
    const repository = new PublicReportRepository(db);

    await expect(
      repository.findLatestBeforeReportDateAndSession("2026-03-21", "pre_market")
    ).resolves.toMatchObject({
      id: "report-prior"
    });
  });

  it("updates the latest report when the report date already exists", async () => {
    const { db, state } = createDbDouble();
    state.selectResult = [
      {
        id: "report-existing",
        reportDate: "2026-03-21"
      }
    ];
    state.updateResult = [
      {
        id: "report-existing",
        reportDate: "2026-03-21",
        indicatorTags: ["NASDAQ -1.20%"]
      }
    ];
    const repository = new PublicReportRepository(db);

    await expect(
      repository.insertReport({
        briefingSession: "pre_market",
        reportDate: "2026-03-21",
        summary: "updated",
        marketRegime: "Neutral",
        totalScore: "0.00",
        signals: [],
        indicatorTags: ["NASDAQ -1.20%"],
        newsReferences: [],
        contentMarkdown: "# updated"
      })
    ).resolves.toMatchObject({
      id: "report-existing"
    });
  });
});
