import { describe, expect, it } from "vitest";

import {
  buildPublicBriefingArchivePath,
  buildPublicBriefingCanonicalPath,
  buildPublicBriefingUrl,
  buildPublicDailyBriefing,
  buildPublicReportDetailPath,
  buildPublicReportDetailUrl
} from "./public-daily-briefing.js";

describe("public daily briefing", () => {
  it("builds a public-safe market briefing without personalized fields", () => {
    const briefing = buildPublicDailyBriefing({
      runDate: "2026-03-20",
      summaryLine: "지수 방향성보다 내부 체력과 리스크 신호를 함께 봐야 하는 구간입니다.",
      marketResults: [
        {
          status: "ok",
          data: {
            itemCode: "SP500",
            itemName: "S&P 500",
            sourceKey: "index:SP:SPX",
            source: "yahoo_finance",
            asOfDate: "2026-03-20",
            previousValue: 6606.49,
            value: 6506.48,
            changePercent: -1.5138
          }
        }
      ],
      keyIndicatorBullets: ["VIX 급등으로 변동성 경계가 강화됐습니다."],
      marketBullets: ["미국 증시 약세가 두드러졌습니다."],
      macroBullets: ["달러 강세와 환율 부담이 유지되고 있습니다."],
      fundFlowBullets: ["수급 breadth는 방어적으로 읽는 편이 적절합니다."],
      eventBullets: ["중동 리스크가 원자재 변동성을 키우고 있습니다."],
      riskBullets: ["변동성 재확인 구간입니다."]
    });

    expect(briefing.title).toBe("🗞️ 오늘의 시장 브리핑 (2026-03-20)");
    expect(briefing.canonicalPath).toBe("/briefings/2026-03-20/");
    expect(briefing.archivePath).toBe("/briefings/2026/03/20/");
    expect(briefing.excludedTelegramOnlySections).toContain("portfolioRebalancing");
    expect(briefing.indicatorTags).toEqual(["S&P500 -1.51%"]);
    expect(briefing.marketSummary.overall).toContain("미국 증시 약세");
    expect(briefing.disclaimer).toContain("개인화 포트폴리오 리밸런싱 제안은 포함하지 않습니다.");
    expect(JSON.stringify(briefing)).not.toContain("비중 확대");
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
