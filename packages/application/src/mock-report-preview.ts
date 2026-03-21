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
          exchange: "US",
          symbol: "AAPL"
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
            asOfDate: runDate,
            previousValue: 17777.78,
            value: 18000,
            changePercent: 1.25
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
              summary: "수요 기대가 커지고 있어.",
              supportingArticleIds: ["mock-article-1"]
            }
          ],
          status: "ok"
        }
      ],
      quantScenarios: ["추세 유지 시 분할 매수 관찰"],
      riskCheckpoints: ["변동성 급등 시 비중 확대를 보류"]
    })
  };
}
