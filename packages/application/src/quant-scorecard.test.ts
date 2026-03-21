import { describe, expect, it } from "vitest";

import { buildQuantScorecards, toQuantStrategyBullets } from "./quant-scorecard.js";
import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief } from "./news.js";

describe("quant scorecard", () => {
  it("builds action scorecards from market regime and holding news", () => {
    const marketResults: MarketDataFetchResult[] = [
      okResult("NASDAQ", "나스닥", -2.01),
      okResult("SP500", "S&P 500", -1.51),
      okResult("DOW", "다우", -0.96),
      okResult("VIX", "VIX", 11.3),
      okResult("KOSPI", "코스피", 0.31),
      okResult("KOSDAQ", "코스닥", 1.58),
      okResult("USD_KRW", "USD/KRW 환율", 0.47),
      okResult("DXY", "달러인덱스", 0.61),
      {
        status: "ok",
        data: {
          itemCode: "US10Y",
          itemName: "미국 10년물 금리",
          source: "fred",
          sourceKey: "rate:US10Y",
          asOfDate: "2026-03-21",
          previousValue: 4.26,
          value: 4.25,
          changePercent: -0.23,
          changeValue: -0.01
        }
      }
    ];
    const portfolioNewsBriefs: HoldingNewsBrief[] = [
      {
        holding: {
          companyName: "Apple Inc.",
          exchange: "US",
          symbol: "AAPL"
        },
        articles: [],
        events: [
          {
            confidence: "high",
            eventType: "product",
            headline: "신제품 기대",
            sentiment: "positive",
            summary: "수요 기대가 유지되고 있습니다.",
            supportingArticleIds: ["a1"]
          }
        ],
        status: "ok"
      }
    ];

    const scorecards = buildQuantScorecards({
      holdings: [
        {
          companyName: "Apple Inc.",
          exchange: "US",
          symbol: "AAPL"
        }
      ],
      marketResults,
      portfolioNewsBriefs
    });

    expect(scorecards).toHaveLength(1);
    const scorecard = scorecards[0]!;

    expect(scorecard).toMatchObject({
      companyName: "Apple Inc.",
      symbol: "AAPL",
      macroScore: -0.6,
      trendScore: -0.4,
      eventScore: 0.3,
      flowScore: 0.1,
      totalScore: -0.25,
      action: "REDUCE"
    });
    expect(scorecard.actionSummary).toContain("비중 축소");
    expect(toQuantStrategyBullets(scorecards)[0]).toContain("Total -0.25");
  });

  it("returns a market-level scorecard when no holdings exist", () => {
    const scorecards = buildQuantScorecards({
      holdings: [],
      marketResults: [],
      portfolioNewsBriefs: []
    });

    expect(scorecards).toEqual([
      expect.objectContaining({
        companyName: "시장 기준",
        eventScore: 0,
        totalScore: 0,
        action: "HOLD"
      })
    ]);
  });
});

function okResult(
  itemCode: string,
  itemName: string,
  changePercent: number
): Extract<MarketDataFetchResult, { status: "ok" }> {
  return {
    status: "ok",
    data: {
      itemCode,
      itemName,
      source: "fred",
      sourceKey: `test:${itemCode}`,
      asOfDate: "2026-03-21",
      previousValue: 100,
      value: 100 + changePercent,
      changePercent
    }
  };
}
