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

    expect(briefing.title).toBe("🗞️ 장 시작 전 시장 브리핑 (2026-03-20)");
    expect(briefing.canonicalPath).toBe("/briefings/2026-03-20/pre-market/");
    expect(briefing.archivePath).toBe("/briefings/2026/03/20/pre-market/");
    expect(briefing.excludedTelegramOnlySections).toContain("portfolioRebalancing");
    expect(briefing.indicatorTags).toEqual(["S&P500 -1.51%"]);
    expect(briefing.marketSummary.purpose).toBe(
      "이번 오전 브리핑은 미국장 마감 결과를 바탕으로 오늘 국내장 시초가와 장 초반 수급 방향을 가늠하는 데 목적이 있습니다."
    );
    expect(briefing.marketSummary.overall).toContain("미국 증시 약세");
    expect(briefing.disclaimer).toContain("개인화 포트폴리오 리밸런싱 제안은 포함하지 않습니다.");
    expect(JSON.stringify(briefing)).not.toContain("비중 확대");
  });

  it("keeps weekend titles and purpose text aligned to the weekend session intent", () => {
    const briefing = buildPublicDailyBriefing({
      briefingSession: "weekend_briefing",
      runDate: "2026-03-28",
      summaryLine: "한 주 흐름을 정리하고 다음 주 준비 포인트를 우선 확인하는 구간입니다.",
      marketResults: [],
      marketBullets: [
        "미국과 국내 증시 모두 변동성 확대가 이어졌습니다.",
        "금리와 환율이 다시 시장 변동성을 자극했습니다."
      ]
    });

    expect(briefing.title).toBe("🗞️ 주말 시장 브리핑 (2026-03-28)");
    expect(briefing.sessionRole).toBe(
      "미장 마감 분석 및 주간 이슈 총정리, 다음 주 일정 요약"
    );
    expect(briefing.marketSummary.purpose).toBe(
      "이번 주말 브리핑은 가장 최근 미장 마감 흐름을 바탕으로 한 주 동안 시장을 움직인 핵심 이슈를 정리하고, 다음 주 주목해야 할 일정과 준비 포인트를 요약하는 데 목적이 있습니다."
    );
    expect(briefing.marketSummary.overall).toBe(
      "미국과 국내 증시 모두 변동성 확대가 이어졌습니다."
    );
  });

  it("keeps post-market titles and purpose text aligned to the evening session intent", () => {
    const briefing = buildPublicDailyBriefing({
      briefingSession: "post_market",
      runDate: "2026-03-27",
      summaryLine: "국내장 결과를 바탕으로 미국장 예보를 다시 맞추는 구간입니다.",
      marketResults: [],
      marketBullets: [
        "국내장 변동성은 컸지만 종가 기준 낙폭은 일부 축소됐습니다.",
        "환율 부담은 남아 있지만 장 후반 수급은 다소 진정됐습니다."
      ]
    });

    expect(briefing.title).toBe("🗞️ 장 마감 후 시장 브리핑 (2026-03-27)");
    expect(briefing.sessionRole).toBe("국장/대체거래소 결과 분석 및 미장 예보");
    expect(briefing.marketSummary.purpose).toBe(
      "이번 저녁 브리핑은 오늘 국내장과 대체거래소 흐름을 정리하고, 그 결과를 바탕으로 오늘 밤 미국장 방향을 예보하는 데 목적이 있습니다."
    );
  });

  it("builds canonical and archive paths from run date", () => {
    expect(buildPublicBriefingCanonicalPath("2026-03-20", "pre_market")).toBe(
      "/briefings/2026-03-20/pre-market/"
    );
    expect(buildPublicBriefingArchivePath("2026-03-20", "pre_market")).toBe(
      "/briefings/2026/03/20/pre-market/"
    );
    expect(
      buildPublicBriefingUrl(
        "https://jeongjibsa.github.io/stock-chatbot/",
        "2026-03-20",
        "pre_market"
      )
    ).toBe("https://jeongjibsa.github.io/stock-chatbot/briefings/2026-03-20/pre-market/");
    expect(buildPublicReportDetailPath("report-1")).toBe("/reports/report-1");
    expect(
      buildPublicReportDetailUrl(
        "https://jeongjibsa.github.io/stock-chatbot/",
        "report-1"
      )
    ).toBe("https://jeongjibsa.github.io/stock-chatbot/reports/report-1");
  });
});
