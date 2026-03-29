import { describe, expect, it } from "vitest";

import { buildRuleBasedBriefing } from "./rule-based-briefing.js";
import type { MarketDataFetchResult } from "./market-data.js";

describe("rule-based-briefing", () => {
  it("builds at least two pre-market key signals even when only one hard threshold fires", () => {
    const briefing = buildRuleBasedBriefing(
      [
        createMarketResult("NASDAQ", -0.4),
        createMarketResult("SP500", -0.2),
        createMarketResult("VIX", 6.8)
      ],
      {
        briefingSession: "pre_market"
      }
    );

    expect(briefing.keyIndicatorBullets.length).toBeGreaterThanOrEqual(2);
    expect(briefing.keyIndicatorBullets).toContain(
      "VIX 급등으로 변동성 경계가 강화됐습니다."
    );
    expect(briefing.keyIndicatorBullets.some((bullet) => bullet.includes("장 시작 전"))).toBe(
      true
    );
  });

  it("builds weekend-specific minimum signals when market moves are muted", () => {
    const briefing = buildRuleBasedBriefing(
      [
        createMarketResult("NASDAQ", 0.1),
        createMarketResult("SP500", 0.05),
        createMarketResult("DXY", 0.05),
        createMarketResult("USD_KRW", 0.02)
      ],
      {
        briefingSession: "weekend_briefing"
      }
    );

    expect(briefing.keyIndicatorBullets.length).toBeGreaterThanOrEqual(3);
    expect(briefing.keyIndicatorBullets.some((bullet) => bullet.includes("주말 브리핑"))).toBe(
      true
    );
    expect(briefing.keyIndicatorBullets.some((bullet) => bullet.includes("다음 주"))).toBe(true);
  });

  it("prefers domestic close signals for post-market fallback", () => {
    const briefing = buildRuleBasedBriefing(
      [
        createMarketResult("KOSPI", -1.2),
        createMarketResult("KOSDAQ", -1.7),
        createMarketResult("USD_KRW", 0.35)
      ],
      {
        briefingSession: "post_market"
      }
    );

    expect(briefing.keyIndicatorBullets.length).toBeGreaterThanOrEqual(2);
    expect(
      briefing.keyIndicatorBullets.some((bullet) => bullet.includes("국내 증시가 약세로 마감"))
    ).toBe(true);
    expect(
      briefing.keyIndicatorBullets.some((bullet) => bullet.includes("장 마감 후"))
    ).toBe(true);
  });
});

function createMarketResult(
  itemCode: string,
  changePercent: number
): MarketDataFetchResult {
  return {
    status: "ok",
    data: {
      itemCode,
      itemName: itemCode,
      source: "fred",
      sourceKey: itemCode,
      asOfDate: "2026-03-29",
      previousValue: 100,
      value: 100 * (1 + changePercent / 100),
      changePercent
    }
  };
}
