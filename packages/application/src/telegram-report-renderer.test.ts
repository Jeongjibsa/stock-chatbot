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
            previousValue: 17777.78,
            value: 18000,
            changePercent: 1.25
          }
        }
      ]
    });

    expect(report).toContain("🗞️ 오늘의 브리핑 | 2026-03-20");
    expect(report).toContain("📌 한 줄 요약");
    expect(report).toContain("나스닥 종합: 17,777.78 → 18,000  🔴▲ 1.25%");
    expect(report).toContain("• Apple Inc. (AAPL, US)");
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

    expect(report).toContain("🧩 누락 또는 지연 항목");
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
      marketResults: [
        {
          status: "ok",
          data: {
            itemCode: "USD_KRW",
            itemName: "USD/KRW 환율",
            source: "fred",
            sourceKey: "fx:USDKRW",
            asOfDate: "2026-03-20",
            previousValue: 1470.2,
            value: 1480.85,
            changePercent: 0.7244
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "DXY",
            itemName: "달러인덱스",
            source: "fred",
            sourceKey: "index:DXY",
            asOfDate: "2026-03-20",
            previousValue: 120.1,
            value: 121.5,
            changePercent: 1.1657
          }
        }
      ],
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

    expect(report).toContain("📰 보유 종목 뉴스");
    expect(report).toContain("🧠 전략 시나리오");
    expect(report).toContain("⚠️ 리스크 체크포인트");
    expect(report).toContain("🔴호재 신제품 공개 신뢰도 높음");
    expect(report).toContain("달러인덱스도 함께 올라 원화만 약한 장은 아니고");
    expect(report).not.toContain("다음 단계에서 연결 예정");
  });
});
