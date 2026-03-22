import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("./db", () => ({
  getWebPool: () => ({
    query
  })
}));

describe("public reports queries", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("falls back to legacy report queries when indicator_tags is missing", async () => {
    query
      .mockRejectedValueOnce({
        code: "42703",
        message: 'column "indicator_tags" does not exist'
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "report-1",
            report_date: "2026-03-20",
            summary: "요약",
            market_regime: "Neutral",
            total_score: "0.00",
            signals: ["KOSPI 보합"],
            content_markdown: "# 보고서",
            created_at: new Date("2026-03-20T00:00:00.000Z")
          }
        ]
      });

    const { listPublicReports } = await import("./public-reports");
    const reports = await listPublicReports();

    expect(reports).toHaveLength(1);
    expect(reports[0]?.indicatorTags).toEqual([]);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("falls back to legacy detail queries when indicator_tags is missing", async () => {
    query
      .mockRejectedValueOnce({
        code: "42703",
        message: 'column "indicator_tags" does not exist'
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "report-2",
            report_date: "2026-03-21",
            summary: "상세 요약",
            market_regime: "Neutral",
            total_score: "0.10",
            signals: ["NASDAQ 반등"],
            content_markdown: "# 상세 보고서",
            created_at: new Date("2026-03-21T00:00:00.000Z")
          }
        ]
      });

    const { getPublicReportById } = await import("./public-reports");
    const report = await getPublicReportById("report-2");

    expect(report?.id).toBe("report-2");
    expect(report?.indicatorTags).toEqual([]);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
