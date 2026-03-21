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
        keyIndicatorBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
        holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
        articleSummaryBullets: ["Apple 관련 핵심 기사는 제품 기대감 유지에 초점을 두고 있습니다."],
        strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
        riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."]
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
      holdings: [
        {
          companyName: "Apple Inc.",
          exchange: "US",
          symbol: "AAPL"
        }
      ],
      marketResults: [],
      newsBriefs: [],
      quantScenarios: [],
      riskCheckpoints: [],
      runDate: "2026-03-21"
    });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "market-report-composition"
      })
    );
    expect(result).toEqual({
      oneLineSummary: "시장 지표와 보유 종목 기준으로 핵심 흐름을 정리했습니다.",
      keyIndicatorBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
      holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
      articleSummaryBullets: ["Apple 관련 핵심 기사는 제품 기대감 유지에 초점을 두고 있습니다."],
      strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
      riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."],
      llmResponseId: "resp_report_1"
    });
  });
});
