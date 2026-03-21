import { describe, expect, it } from "vitest";

import {
  buildPublicBriefingArchivePath,
  buildPublicBriefingCanonicalPath,
  buildPublicReportDetailPath,
  buildPublicReportDetailUrl,
  buildPublicBriefingUrl,
  buildPublicDailyBriefing
} from "./public-daily-briefing.js";

describe("public daily briefing", () => {
  it("builds a public-safe briefing projection", () => {
    const briefing = buildPublicDailyBriefing({
      runDate: "2026-03-20",
      summaryLine: "Risk-Off 구간으로 신규 매수는 보수적으로 접근하시는 편이 좋습니다.",
      marketResults: [
        {
          status: "ok",
          data: {
            itemCode: "NASDAQ",
            itemName: "NASDAQ",
            sourceKey: "index:NASDAQ:IXIC",
            source: "yahoo_finance",
            asOfDate: "2026-03-20",
            previousValue: 22090.6895,
            value: 21647.6113,
            changePercent: -2.0057
          }
        }
      ],
      keyIndicatorBullets: ["VIX 급등으로 Risk-Off가 강화됐습니다."],
      marketBullets: ["미국 기술주 중심의 약세가 확대됐습니다."],
      macroBullets: ["달러 강세와 환율 부담이 유지되고 있습니다."],
      fundFlowBullets: [],
      eventBullets: ["중동 리스크가 원자재 변동성을 키우고 있습니다."],
      riskBullets: ["환율 1,500원선 근접 여부를 점검하시는 편이 좋습니다."]
    });

    expect(briefing).toEqual(
      expect.objectContaining({
        title: "오늘의 브리핑 (2026-03-20 기준)",
        canonicalPath: "/briefings/2026-03-20/",
        archivePath: "/briefings/2026/03/20/",
        excludedTelegramOnlySections: expect.arrayContaining([
          "holdings",
          "articleSummaryBullets",
          "personalizedQuantScorecards"
        ])
      })
    );
    expect(briefing.marketSnapshot).toHaveLength(1);
  });

  it("builds canonical and archive paths from run date", () => {
    expect(buildPublicBriefingCanonicalPath("2026-03-20")).toBe("/briefings/2026-03-20/");
    expect(buildPublicBriefingArchivePath("2026-03-20")).toBe("/briefings/2026/03/20/");
    expect(
      buildPublicBriefingUrl("https://jeongjibsa.github.io/stock-chatbot/", "2026-03-20")
    ).toBe("https://jeongjibsa.github.io/stock-chatbot/briefings/2026-03-20/");
    expect(buildPublicReportDetailPath("report-1")).toBe("/reports/report-1");
    expect(
      buildPublicReportDetailUrl(
        "https://jeongjibsa.github.io/stock-chatbot/",
        "report-1"
      )
    ).toBe("https://jeongjibsa.github.io/stock-chatbot/reports/report-1");
  });
});
