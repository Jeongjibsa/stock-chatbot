import { describe, expect, it } from "vitest";

import { renderTelegramDailyReport } from "./telegram-report-renderer.js";

describe("renderTelegramDailyReport", () => {
  it("renders successful market items and holdings", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [
        {
          companyName: "Apple Inc.",
          symbol: "AAPL",
          exchange: "US"
        }
      ],
      marketResults: [
        {
          status: "ok",
          data: {
            itemCode: "NASDAQ",
            itemName: "나스닥 종합",
            source: "fred",
            sourceKey: "index:NASDAQ:IXIC",
            asOfDate: "2026-03-20",
            value: 18000,
            changePercent: 1.25
          }
        }
      ]
    });

    expect(report).toContain("오늘의 브리핑 (2026-03-20)");
    expect(report).toContain("나스닥 종합: 18000 (+1.25%)");
    expect(report).toContain("Apple Inc. (AAPL, US)");
  });

  it("renders missing source section when failures exist", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [],
      marketResults: [
        {
          status: "error",
          errorCode: "unsupported_source",
          sourceKey: "index:KRX:KOSPI",
          message: "unsupported"
        }
      ]
    });

    expect(report).toContain("[누락 또는 지연 항목]");
    expect(report).toContain("index:KRX:KOSPI: unsupported");
    expect(report).toContain("등록된 보유 종목이 없어.");
  });

  it("renders news, strategy and risk sections when enrichment exists", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [
        {
          companyName: "Apple Inc.",
          symbol: "AAPL",
          exchange: "US"
        }
      ],
      marketResults: [],
      portfolioNewsBriefs: [
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
              headline: "신제품 공개",
              sentiment: "positive",
              summary: "수요 기대가 커지고 있어.",
              supportingArticleIds: ["a1"]
            }
          ],
          status: "ok"
        }
      ],
      quantScenarios: ["추세 유지 시 분할 매수 관찰"],
      riskCheckpoints: ["변동성 급등 시 비중 확대를 보류"],
    });

    expect(report).toContain("[보유 종목 뉴스]");
    expect(report).toContain("[전략 시나리오]");
    expect(report).toContain("[리스크 체크포인트]");
    expect(report).not.toContain("다음 단계에서 연결 예정");
  });
});
