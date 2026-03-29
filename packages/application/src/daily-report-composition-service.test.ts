import { describe, expect, it, vi } from "vitest";

import { DailyReportCompositionService } from "./daily-report-composition-service.js";

describe("DailyReportCompositionService", () => {
  it("builds a structured composition request and parses the response", async () => {
    const generate = vi.fn(async () => ({
      id: "resp_report_1",
      executionMode: "synchronous" as const,
      model: "gpt-5-mini",
      outputText: JSON.stringify({
        oneLineSummary: "시장 지표와 보유 종목 기준으로 핵심 흐름을 정리했습니다.",
        marketBullets: ["미국 지수와 변동성 지표를 함께 보면 위험 선호가 약해졌습니다."],
        macroBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
        fundFlowBullets: ["한국 수급과 ETF flow 데이터는 아직 입력되지 않았습니다."],
        eventBullets: ["중동 리스크와 AI 반도체 이슈가 동시에 시장 변동성을 키우고 있습니다."],
        holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
        articleSummaryBullets: ["Apple 관련 핵심 기사는 제품 기대감 유지에 초점을 두고 있습니다."],
        keyIndicatorBullets: ["달러 강세와 환율 부담을 먼저 점검하셔야 합니다."],
        headlineEvents: [],
        strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
        riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."],
        trendNewsBullets: ["달러 강세와 금리 뉴스가 겹쳐 시장 전반 부담이 커졌습니다."],
        newsReferences: [
          {
            sourceLabel: "Reuters",
            title: "Dollar strength persists",
            url: "https://example.com/reuters-dollar"
          }
        ]
      }),
      provider: "openai" as const,
      status: "completed" as const
    }));
    const service = new DailyReportCompositionService({
      llmClient: {
        generate
      }
    });

    const result = await service.compose({
      audience: "telegram_personalized",
      holdings: [
        {
          companyName: "Apple Inc.",
          exchange: "US",
          symbol: "AAPL"
        }
      ],
      marketResults: [],
      newsBriefs: [],
      quantScorecards: [
        {
          companyName: "Apple Inc.",
          symbol: "AAPL",
          macroScore: -0.4,
          trendScore: -0.4,
          eventScore: 0.2,
          flowScore: -0.1,
          totalScore: -0.23,
          action: "REDUCE",
          actionSummary:
            "Apple Inc.는 반등 시 비중 축소 또는 손절 기준 재점검이 우선입니다."
        }
      ],
      quantScenarios: [],
      riskCheckpoints: [],
      runDate: "2026-03-21",
      timeoutMs: 8000
    });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          promptAudience: "telegram_personalized",
          promptKind: "telegram-personalized-report-composition"
        }),
        task: "market-report-composition",
        timeoutMs: 8000
      })
    );
    expect(result).toEqual({
      oneLineSummary: "시장 지표와 보유 종목 기준으로 핵심 흐름을 정리했습니다.",
      marketBullets: ["미국 지수와 변동성 지표를 함께 보면 위험 선호가 약해졌습니다."],
      macroBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
      fundFlowBullets: ["한국 수급과 ETF flow 데이터는 아직 입력되지 않았습니다."],
      eventBullets: ["중동 리스크와 AI 반도체 이슈가 동시에 시장 변동성을 키우고 있습니다."],
      holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
      articleSummaryBullets: ["Apple 관련 핵심 기사는 제품 기대감 유지에 초점을 두고 있습니다."],
      keyIndicatorBullets: ["달러 강세와 환율 부담을 먼저 점검하셔야 합니다."],
      headlineEvents: [],
      strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
      riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."],
      trendNewsBullets: ["달러 강세와 금리 뉴스가 겹쳐 시장 전반 부담이 커졌습니다."],
      newsReferences: [
        {
          sourceLabel: "Reuters",
          title: "Dollar strength persists",
          url: "https://example.com/reuters-dollar"
        }
      ],
      llmResponseId: "resp_report_1"
    });
  });

  it("repairs empty public keyIndicatorBullets from other public composition bullets", async () => {
    const generate = vi.fn(async () => ({
      executionMode: "synchronous" as const,
      model: "gpt-5-mini",
      outputText: JSON.stringify({
        oneLineSummary: "달러 강세와 금리 부담을 함께 봐야 하는 날입니다.",
        marketBullets: [
          "이번 오전 브리핑은 미국장 마감 결과를 바탕으로 오늘 국내장 시초가와 장 초반 수급 방향을 가늠하는 데 목적이 있습니다.",
          "미국 증시 반등이 이어져 국내 개장 초반 위험 선호 회복 여부를 볼 필요가 있습니다."
        ],
        macroBullets: ["달러 강세와 환율 부담이 이어져 외환 압력을 같이 보셔야 합니다."],
        fundFlowBullets: [],
        eventBullets: ["오늘 대응 기준은 환율과 선물 방향이 같은 쪽인지 먼저 보는 것입니다."],
        holdingTrendBullets: [],
        articleSummaryBullets: [],
        keyIndicatorBullets: [],
        headlineEvents: [],
        strategyBullets: [],
        riskBullets: ["미국 장기금리 부담이 남아 있어 성장주 밸류 부담을 같이 보셔야 합니다."],
        trendNewsBullets: ["달러 강세 뉴스가 반복돼 위험 자산 선호는 다소 눌릴 수 있습니다."],
        newsReferences: []
      }),
      provider: "openai" as const,
      status: "completed" as const
    }));
    const service = new DailyReportCompositionService({
      llmClient: { generate }
    });

    const result = await service.compose({
      audience: "public_web",
      briefingSession: "pre_market",
      holdings: [],
      marketResults: [],
      newsBriefs: [],
      quantScorecards: [],
      quantScenarios: [],
      riskCheckpoints: [],
      runDate: "2026-03-29"
    });

    expect(result.keyIndicatorBullets).toEqual([
      "미국 증시 반등이 이어져 국내 개장 초반 위험 선호 회복 여부를 볼 필요가 있습니다.",
      "달러 강세와 환율 부담이 이어져 외환 압력을 같이 보셔야 합니다.",
      "미국 장기금리 부담이 남아 있어 성장주 밸류 부담을 같이 보셔야 합니다.",
      "오늘 대응 기준은 환율과 선물 방향이 같은 쪽인지 먼저 보는 것입니다."
    ]);
  });
});
