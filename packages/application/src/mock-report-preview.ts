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
          companyName: "삼성전자",
          currentPrice: 182000,
          changePercent: -1.08,
          exchange: "KR",
          previousClose: 184000,
          symbol: "005930",
          trendSummary:
            "평단 188,129원 기준 27주 보유 중이며, AI 메모리와 외국인 수급 변화에 민감한 구간입니다."
        },
        {
          companyName: "SK하이닉스",
          currentPrice: 934000,
          changePercent: -1.58,
          exchange: "KR",
          previousClose: 949000,
          symbol: "000660",
          trendSummary:
            "평단 947,250원 기준 7주 보유 중이며, HBM 수요 기대와 대형 반도체 변동성에 같이 노출돼 있습니다."
        },
        {
          companyName: "현대차",
          currentPrice: 228500,
          changePercent: 1.33,
          exchange: "KR",
          previousClose: 225500,
          symbol: "005380",
          trendSummary:
            "평단 224,500원 기준 6주 보유 중이며, 환율과 북미 판매 지표가 단기 방향성에 중요합니다."
        },
        {
          companyName: "에코프로",
          currentPrice: 149000,
          changePercent: -2.61,
          exchange: "KR",
          previousClose: 153000,
          symbol: "086520",
          trendSummary:
            "평단 152,200원 기준 10주 보유 중이며, 2차전지 밸류체인 수급과 변동성 영향이 큰 구간입니다."
        },
        {
          companyName: "현대글로비스",
          currentPrice: 229000,
          changePercent: 1.10,
          exchange: "KR",
          previousClose: 226500,
          symbol: "086280",
          trendSummary:
            "평단 224,500원 기준 6주 보유 중이며, 완성차 물동량과 해상 운임 흐름을 함께 볼 필요가 있습니다."
        },
        {
          companyName: "HMM",
          currentPrice: 20800,
          changePercent: -1.42,
          exchange: "KR",
          previousClose: 21100,
          symbol: "011200",
          trendSummary:
            "평단 21,100원 기준 100주 보유 중이며, 컨테이너 운임과 지정학 리스크에 따른 물류 차질 이슈를 같이 봐야 합니다."
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
            companyName: "삼성전자",
            exchange: "KR",
            symbol: "005930"
          },
          articles: [],
          events: [
            {
              confidence: "high",
              eventType: "product",
              headline: "HBM 및 AI 서버 메모리 수요 기대",
              sentiment: "positive",
              summary: "AI 반도체 투자 심리가 유지되며 메모리 업황 기대가 이어지고 있습니다.",
              supportingArticleIds: ["mock-article-1"]
            }
          ],
          status: "ok"
        }
      ],
      quantScorecards: [
        {
          companyName: "삼성전자",
          symbol: "005930",
          macroScore: -0.6,
          trendScore: -0.3,
          eventScore: 0.2,
          flowScore: -0.1,
          totalScore: -0.29,
          action: "REDUCE",
          actionSummary:
            "삼성전자는 신규 매수보다 기존 비중 점검과 분할 대응이 우선입니다."
        },
        {
          companyName: "현대차",
          symbol: "005380",
          macroScore: -0.4,
          trendScore: 0.2,
          eventScore: 0.1,
          flowScore: 0.1,
          totalScore: -0.09,
          action: "HOLD",
          actionSummary:
            "현대차는 환율 수혜 기대가 남아 있어 성급한 추격보다 보유 관점 유지가 적절합니다."
        }
      ],
      quantScenarios: [
        "반도체 비중은 단기 반등 시 분할 축소 여부를 점검하시고, 자동차는 환율 수혜가 유지되는지 확인하며 보유 관점을 유지하시는 편이 좋습니다.",
        "에코프로와 HMM처럼 변동성이 큰 종목은 신규 매수보다 손절 기준과 목표 비중을 먼저 정하시는 편이 좋습니다."
      ],
      riskCheckpoints: [
        "중동 지정학 리스크가 원자재와 해운 변동성을 동시에 자극할 수 있습니다.",
        "반도체주 비중이 높아 미국 기술주 조정이 국내 대형주로 전이되는지 확인하시는 편이 좋습니다."
      ]
    })
  };
}
