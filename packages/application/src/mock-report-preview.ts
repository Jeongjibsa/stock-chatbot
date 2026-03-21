import { renderTelegramDailyReport } from "./telegram-report-renderer.js";

export type MockReportPreview = {
  renderedText: string;
  runDate: string;
  userId: string;
};

export function buildMockTelegramReportPreview(input?: {
  runDate?: string;
  userId?: string;
}): MockReportPreview {
  const runDate = input?.runDate ?? "2026-03-21";
  const userId = input?.userId ?? "mock-user";

  return {
    userId,
    runDate,
    renderedText: renderTelegramDailyReport({
      displayName: "Mock User",
      runDate,
      holdings: [
        {
          companyName: "Apple Inc.",
          currentPrice: 247.99,
          changePercent: -0.39,
          exchange: "US",
          previousClose: 248.96,
          symbol: "AAPL",
          trendSummary:
            "이란 전쟁발 지정학 리스크와 대형 기술주 약세가 겹치며 전일 대비 조정받았습니다."
        }
      ],
      keyIndicatorSummaries: [
        "중동 이란 전쟁 이슈로 원유 공급 차질 우려가 커지며 유가와 달러 강세 압력이 같이 반영되고 있습니다."
      ],
      marketBullets: [
        "S&P500과 NASDAQ은 기술주 중심으로 흔들렸고, VIX는 위험 회피 심리를 시사하고 있습니다.",
        "KOSPI와 KOSDAQ은 국내 수급 민감도가 큰 장으로 해석하시는 편이 좋습니다."
      ],
      macroBullets: [
        "미국 10년물 금리와 달러 인덱스를 함께 보면 긴축 경계가 완전히 해소되진 않았습니다.",
        "CPI와 기준금리 관련 새 발표가 없는 날에는 기존 금리 부담이 그대로 해석에 반영됩니다."
      ],
      fundFlowBullets: [
        "외국인·기관 수급과 ETF flow 데이터는 아직 연결 전이므로 정량 해석은 보수적으로 보시는 편이 좋습니다."
      ],
      eventBullets: [
        "주요 뉴스는 중동 지정학 리스크, AI·반도체 수요 기대, 원자재 가격 변동에 집중되고 있습니다.",
        "예정 실적 발표 일정 데이터는 아직 연결되지 않아 별도 캘린더 확인이 필요합니다."
      ],
      marketResults: [
        {
          status: "ok",
          data: {
            itemCode: "NASDAQ",
            itemName: "나스닥 종합",
            source: "fred",
            sourceKey: "index:NASDAQ:IXIC",
            asOfDate: runDate,
            previousValue: 17777.78,
            value: 18000,
            changePercent: 1.25
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "SP500",
            itemName: "S&P 500",
            source: "fred",
            sourceKey: "index:SP:SPX",
            asOfDate: runDate,
            previousValue: 5711.2,
            value: 5662.4,
            changePercent: -0.8544
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "VIX",
            itemName: "VIX",
            source: "fred",
            sourceKey: "index:CBOE:VIX",
            asOfDate: runDate,
            previousValue: 18.2,
            value: 21.6,
            changePercent: 18.6813
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "USD_KRW",
            itemName: "USD/KRW 환율",
            source: "fred",
            sourceKey: "fx:USDKRW",
            asOfDate: runDate,
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
            asOfDate: runDate,
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
              supportingArticleIds: ["mock-article-1"]
            }
          ],
          status: "ok"
        }
      ],
      quantScenarios: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
      riskCheckpoints: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."]
    })
  };
}
