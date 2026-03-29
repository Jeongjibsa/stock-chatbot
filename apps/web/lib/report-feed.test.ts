import { describe, expect, it } from "vitest";

import { groupReportsByDate, normalizeMarketRegime, scoreTone } from "./report-feed";

describe("report-feed utils", () => {
  it("groups reports by date in original sorted order", () => {
    expect(
      groupReportsByDate([
        {
          id: "r3",
          briefingSession: "weekend_briefing",
          reportDate: "2026-03-22",
          summary: "weekend",
          indicatorTags: [],
          newsReferences: [],
          marketRegime: "Neutral",
          totalScore: 0.2,
          signals: [],
          contentMarkdown: "",
          createdAt: "2026-03-22T01:00:00.000Z"
        },
        {
          id: "r2",
          briefingSession: "post_market",
          reportDate: "2026-03-22",
          summary: "latest",
          indicatorTags: ["KOSPI +0.31%"],
          newsReferences: [],
          marketRegime: "Risk-On",
          totalScore: 0.4,
          signals: [],
          contentMarkdown: "",
          createdAt: "2026-03-22T00:00:00.000Z"
        },
        {
          id: "r1",
          briefingSession: "pre_market",
          reportDate: "2026-03-22",
          summary: "earlier",
          indicatorTags: ["NASDAQ -2.01%"],
          newsReferences: [],
          marketRegime: "Neutral",
          totalScore: 0,
          signals: [],
          contentMarkdown: "",
          createdAt: "2026-03-21T23:00:00.000Z"
        },
        {
          id: "r0",
          briefingSession: "pre_market",
          reportDate: "2026-03-21",
          summary: "older",
          indicatorTags: ["NASDAQ -2.01%"],
          newsReferences: [],
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
        reports: [
          expect.objectContaining({ id: "r2" }),
          expect.objectContaining({ id: "r1" }),
          expect.objectContaining({ id: "r3" })
        ]
      },
      {
        reportDate: "2026-03-21",
        reports: [expect.objectContaining({ id: "r0" })]
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
