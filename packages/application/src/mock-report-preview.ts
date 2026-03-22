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
      ],
      portfolioRebalancing: {
        selectedProfile: "balanced",
        portfolioSummary: {
          holdingCount: 6,
          increaseCount: 1,
          holdCount: 3,
          watchCount: 1,
          reduceCount: 1,
          eventRiskCount: 2
        },
        rebalancingSummary: {
          increaseCandidates: ["삼성전자"],
          holdCandidates: ["SK하이닉스", "현대차", "현대글로비스"],
          watchCandidates: ["HMM"],
          reduceCandidates: ["에코프로"]
        },
        marketOverlay: {
          market: "KOSPI",
          marketCompositeLabel: "다소과열",
          sentimentLabel: "적정",
          marketStrengthLabel: "적정",
          marketFundamentalLabel: "과열",
          blackSwanLabel: "과열",
          buffettByMarketLabel: "매우 고평가",
          finalMarketRegimeScoreBalanced: 31,
          finalMarketRegimeScoreConservative: 24,
          finalMarketRegimeScoreAggressive: 39
        },
        holdings: [
          {
            name: "삼성전자",
            finalAction: "확대 검토",
            intrinsicValueScore: 71,
            priceTrendScore: 63,
            futureExpectationScore: 58,
            portfolioFitScore: 76,
            oneLineJudgment:
              "내재 가치는 양호하고 포트 적합성도 무난해 선별적 확대 후보로 볼 수 있지만, 시장 전체가 공격적 확대를 허용하는 환경은 아닙니다.",
            guide:
              "추격 매수보다는 기존 비중 대비 부족한 구간에서 분할 접근을 검토하는 편이 자연스럽습니다."
          },
          {
            name: "SK하이닉스",
            finalAction: "유지 우세",
            intrinsicValueScore: 67,
            priceTrendScore: 74,
            futureExpectationScore: 64,
            portfolioFitScore: 61,
            hardRules: [
              {
                code: "SECTOR_CONCENTRATION",
                reason: "반도체 비중이 이미 높아 추가 집중 리스크가 존재합니다.",
                effect: "비중 제한"
              }
            ],
            oneLineJudgment:
              "가격/추세와 미래 기대치는 상대적으로 좋지만, 이미 높은 반도체 비중이 포트 차원의 제약으로 작용합니다.",
            guide:
              "종목 자체는 견조하지만, 지금은 추가 확대보다 기존 보유 유지와 비중 관리 쪽에 무게가 실립니다."
          },
          {
            name: "현대차",
            finalAction: "유지 우세",
            intrinsicValueScore: 73,
            priceTrendScore: 56,
            futureExpectationScore: 52,
            portfolioFitScore: 72,
            oneLineJudgment:
              "내재 가치 관점은 괜찮지만 흐름과 기대치가 강하게 확장되는 구간은 아니어서 포트 내 안정적 보유 관점이 더 적절합니다."
          },
          {
            name: "현대글로비스",
            finalAction: "유지 우세",
            intrinsicValueScore: 64,
            priceTrendScore: 54,
            futureExpectationScore: 49,
            portfolioFitScore: 69,
            oneLineJudgment:
              "전반적으로 극단적 강점은 아니지만 포트 내 역할은 무난하며, 지금은 과도한 액션보다 유지 관점이 자연스럽습니다."
          },
          {
            name: "HMM",
            finalAction: "관찰 필요",
            intrinsicValueScore: 52,
            priceTrendScore: 46,
            futureExpectationScore: 51,
            portfolioFitScore: 58,
            hardRules: [
              {
                code: "HIGH_EVENT_UNCERTAINTY",
                reason: "업황과 이벤트 민감도가 높아 관찰 우선 해석이 적절합니다.",
                effect: "관찰 우선"
              }
            ],
            oneLineJudgment:
              "가격/추세와 미래 기대치 모두 강하다고 보기 어렵고, 이벤트 민감도까지 높아 방향성 확인이 더 필요한 상태입니다."
          },
          {
            name: "에코프로",
            finalAction: "일부 축소",
            intrinsicValueScore: 39,
            priceTrendScore: 58,
            futureExpectationScore: 44,
            portfolioFitScore: 43,
            hardRules: [
              {
                code: "OVERWEIGHT_HIGH_VOLATILITY",
                reason: "변동성이 높은 종목인데 포트 내 비중과 집중 리스크가 부담됩니다.",
                effect: "축소 우선"
              }
            ],
            oneLineJudgment:
              "가격/추세가 아주 무너지진 않았지만, 내재 가치와 포트 적합성 부담이 크고 변동성까지 높아 포트 차원의 조정 논리가 우세합니다.",
            guide:
              "전면 이탈보다도 먼저 비중을 낮춰 포트 변동성을 완화하는 접근이 더 적절합니다."
          }
        ],
        riskBullets: [
          "시장 valuation 부담이 높아 전체 확대 신호를 보수적으로 해석할 필요가 있습니다.",
          "블랙스완 지수가 높아 종목 간 동조화 리스크를 점검해야 합니다.",
          "반도체와 고변동 성장주 비중이 동시에 높아 포트 집중 관리가 중요합니다."
        ],
        referenceMarketBrief: {
          macroSummary: "금리와 환율 흐름이 증시 해석에 계속 영향을 주는 구간입니다.",
          flowSummary: "지수는 버티지만 종목별 차별화와 섹터별 편차가 이어지고 있습니다.",
          eventSummary: "주요 실적과 거시 이벤트가 단기 변동성을 키울 수 있습니다."
        }
      }
    })
  };
}
