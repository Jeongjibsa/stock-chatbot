import { describe, expect, it } from "vitest";

import { renderTelegramDailyReport } from "./telegram-report-renderer.js";

describe("renderTelegramDailyReport", () => {
  it("renders the personalized rebalancing template with holding guides", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      summaryLine:
        "종목별 흐름은 일부 버티고 있지만, 시장 valuation 부담과 구조 리스크가 높아 오늘은 신규 확대보다 유지와 선별 조정 중심 접근이 더 적절합니다.",
      holdings: [
        {
          companyName: "삼성전자",
          currentPrice: 182000,
          changePercent: -1.09,
          exchange: "KR",
          previousClose: 184000,
          symbol: "005930"
        },
        {
          companyName: "에코프로",
          currentPrice: 149000,
          changePercent: -2.61,
          exchange: "KR",
          previousClose: 153000,
          symbol: "086520"
        }
      ],
      marketResults: [],
      publicBriefingUrl: "https://example.com/reports/1",
      portfolioRebalancing: {
        selectedProfile: "balanced",
        portfolioSummary: {
          holdingCount: 2,
          increaseCount: 1,
          holdCount: 0,
          watchCount: 0,
          reduceCount: 1,
          eventRiskCount: 1
        },
        rebalancingSummary: {
          increaseCandidates: ["삼성전자"],
          reduceCandidates: ["에코프로"]
        },
        marketOverlay: {
          marketCompositeLabel: "다소과열",
          sentimentLabel: "적정",
          marketStrengthLabel: "적정",
          marketFundamentalLabel: "과열",
          blackSwanLabel: "과열",
          buffettByMarketLabel: "매우 고평가",
          finalMarketRegimeScoreBalanced: 31
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
              "내재 가치는 양호하고 포트 적합성도 무난해 선별적 확대 후보로 볼 수 있지만, 시장 전체가 공격적 확대를 허용하는 환경은 아닙니다."
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
                reason: "변동성이 높은 종목인데 포트 내 비중과 집중 리스크가 부담됩니다."
              }
            ]
          }
        ],
        riskBullets: [
          "시장 valuation 부담이 높아 전체 확대 신호를 보수적으로 해석할 필요가 있습니다."
        ],
        referenceMarketBrief: {
          macroSummary: "금리와 환율 흐름이 증시 해석에 계속 영향을 주는 구간입니다.",
          flowSummary: "지수는 버티지만 종목별 차별화가 이어지고 있습니다.",
          eventSummary: "주요 실적과 거시 이벤트가 단기 변동성을 키울 수 있습니다."
        }
      }
    });

    expect(report).toContain("1. 🗞️ 오늘의 포트폴리오 리밸런싱 브리핑 (2026-03-20)");
    expect(report).toContain("3. 🎯 오늘의 리밸런싱 제안");
    expect(report).toContain("- 비중 확대 검토: 삼성전자");
    expect(report).toContain("- 비중 조절 필요: 에코프로");
    expect(report).toContain("4. 🧩 성향별 해석");
    expect(report).toContain("6. 🌡️ 시장 레짐 요약");
    expect(report).toContain("[삼성전자]");
    expect(report).toContain("- 내재 가치: 양호");
    expect(report).toContain("[에코프로]");
    expect(report).toContain("- 제약 요인: 변동성이 높은 종목인데 포트 내 비중과 집중 리스크가 부담됩니다.");
    expect(report).toContain("10. 🔎 공개 상세 브리핑");
    expect(report).toContain("https://example.com/reports/1");
  });

  it("weakens expansion tone when market overlay is overvalued and structurally fragile", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [
        {
          companyName: "삼성전자",
          exchange: "KR",
          symbol: "005930"
        }
      ],
      marketResults: [],
      portfolioRebalancing: {
        selectedProfile: "balanced",
        rebalancingSummary: {
          increaseCandidates: ["삼성전자"]
        },
        marketOverlay: {
          marketFundamentalLabel: "과열",
          blackSwanLabel: "과열",
          buffettByMarketLabel: "매우 고평가",
          finalMarketRegimeScoreBalanced: 31
        },
        holdings: [
          {
            name: "삼성전자",
            finalAction: "확대 검토",
            oneLineJudgment: "개별 종목 매력은 남아 있지만 시장 전체가 공격적 확대를 허용하는 환경은 아닙니다."
          }
        ]
      }
    });

    expect(report).toContain("핵심 보유 종목은 유지 가능하지만 확대는 선별적으로만 보는 편이 적절합니다.");
    expect(report).toContain("추세가 살아 있는 종목은 볼 수 있어도 시장 전체가 추격 확대를 정당화하는 환경은 아닙니다.");
    expect(report).not.toContain("적극 확대");
  });

  it("does not use expansion language when a holding is constrained by overweight hard rules", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [
        {
          companyName: "SK하이닉스",
          exchange: "KR",
          symbol: "000660"
        }
      ],
      marketResults: [],
      portfolioRebalancing: {
        holdings: [
          {
            name: "SK하이닉스",
            finalAction: "유지 우세",
            intrinsicValueScore: 67,
            priceTrendScore: 74,
            futureExpectationScore: 64,
            portfolioFitScore: 61,
            hardRules: [
              {
                reason: "반도체 비중이 이미 높아 추가 집중 리스크가 존재합니다."
              }
            ],
            oneLineJudgment:
              "가격/추세와 미래 기대치는 상대적으로 좋지만, 이미 높은 반도체 비중이 포트 차원의 제약으로 작용합니다."
          }
        ]
      }
    });

    expect(report).toContain("- 최종 의견: 유지 우세");
    expect(report).toContain("- 제약 요인: 반도체 비중이 이미 높아 추가 집중 리스크가 존재합니다.");
    expect(report).not.toContain("- 최종 의견: 확대 검토");
  });

  it("uses natural fallback labels instead of raw zero values when data is incomplete", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [
        {
          companyName: "Apple Inc.",
          exchange: "US",
          symbol: "AAPL"
        }
      ],
      marketResults: [],
      publicBriefingUrl: "https://example.com/reports/1"
    });

    expect(report).toContain("- 내재 가치: 확인 필요");
    expect(report).toContain("- 포트 적합성: 확인 필요");
    expect(report).not.toContain("0.00%");
    expect(report).not.toContain("0.00");
  });
});
