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
          currentPrice: 247.99,
          changePercent: -0.39,
          symbol: "AAPL",
          exchange: "US",
          previousClose: 248.96
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
    expect(report).toContain("🧭 주요 지표 변동 요약");
    expect(report).toContain("나스닥 종합: 17,777.78 → 18,000  🔴▲ 1.25%");
    expect(report).toContain("• Apple Inc. (AAPL, US): 248.96 → 247.99  🔵▼ 0.39%");
    expect(report).toContain("시장 지표 1개와 보유 종목 1개 기준으로 정리했습니다.");
    expect(report).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
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
    expect(report).toContain("등록된 보유 종목이 없습니다.");
    expect(report).toContain("관련 기사 요약이 아직 없습니다.");
    expect(report).toContain("규칙 기반 시그널이 아직 없습니다.");
    expect(report).toContain("❗ 이 리포트는 정보 제공용이며");
  });

  it("renders news, strategy and risk sections when enrichment exists", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [
        {
          companyName: "Apple Inc.",
          currentPrice: 247.99,
          changePercent: -0.39,
          symbol: "AAPL",
          exchange: "US",
          previousClose: 248.96,
          trendSummary: "대형 기술주 약세 영향으로 하루 조정을 받았습니다."
        }
      ],
      keyIndicatorSummaries: [
        "중동 이란 전쟁 이슈로 원유 공급 차질 우려가 커지며 유가와 달러 강세 압력이 같이 반영되고 있습니다."
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
              summary: "수요 기대가 커지고 있습니다.",
              supportingArticleIds: ["a1"]
            }
          ],
          status: "ok"
        }
      ],
      quantScenarios: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
      riskCheckpoints: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."]
    });

    expect(report).toContain("📰 종목 관련 핵심 기사 요약");
    expect(report).toContain("🧠 퀀트 기반 시그널 및 매매 아이디어");
    expect(report).toContain("⚠️ 리스크 체크포인트");
    expect(report).toContain("🔴호재 신제품 공개 신뢰도 높음");
    expect(report).toContain("Apple Inc. (AAPL, US): 248.96 → 247.99  🔵▼ 0.39%");
    expect(report).toContain("중동 이란 전쟁 이슈로 원유 공급 차질 우려가 커지며");
    expect(report).toContain("달러인덱스도 함께 올라 원화만 약한 장은 아니고");
    expect(report).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });
});
