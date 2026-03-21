import { describe, expect, it } from "vitest";

import { groupReportsByDate, normalizeMarketRegime, scoreTone } from "./report-feed";

describe("report-feed utils", () => {
  it("groups reports by date in original sorted order", () => {
    expect(
      groupReportsByDate([
        {
          id: "r2",
          reportDate: "2026-03-22",
          summary: "latest",
          marketRegime: "Risk-On",
          totalScore: 0.4,
          signals: [],
          contentMarkdown: "",
          createdAt: "2026-03-22T00:00:00.000Z"
        },
        {
          id: "r1",
          reportDate: "2026-03-21",
          summary: "older",
          marketRegime: "Neutral",
          totalScore: 0,
          signals: [],
          contentMarkdown: "",
          createdAt: "2026-03-21T00:00:00.000Z"
        }
      ])
    ).toEqual([
      {
        reportDate: "2026-03-22",
        reports: [expect.objectContaining({ id: "r2" })]
      },
      {
        reportDate: "2026-03-21",
        reports: [expect.objectContaining({ id: "r1" })]
      }
    ]);
  });

  it("normalizes unknown regimes to neutral", () => {
    expect(normalizeMarketRegime("Risk-On")).toBe("Risk-On");
    expect(normalizeMarketRegime("other")).toBe("Neutral");
  });

  it("maps total score to badge tone", () => {
    expect(scoreTone(0.3)).toBe("positive");
    expect(scoreTone(-0.3)).toBe("negative");
    expect(scoreTone(0.1)).toBe("neutral");
  });
});
