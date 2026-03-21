import { describe, expect, it } from "vitest";

import {
  buildDailyReportPromptContract,
  parseDailyReportStructuredOutput
} from "./report-prompt-contract.js";

describe("report prompt contract", () => {
  it("builds a JSON-only prompt contract", () => {
    const prompt = buildDailyReportPromptContract({
      holdings: [
        {
          companyName: "Apple Inc.",
          exchange: "US",
          symbol: "AAPL"
        }
      ],
      marketResults: [],
      newsBriefs: [],
      quantScenarios: ["분할 매수 관찰"],
      riskCheckpoints: ["손절 기준 재점검"],
      runDate: "2026-03-20"
    });

    expect(prompt.instructions).toContain("반드시 JSON 객체만 반환");
    expect(prompt.instructions).toContain("한국어 존댓말");
    expect(prompt.metadata).toEqual({
      promptKind: "market-report-composition",
      runDate: "2026-03-20"
    });
    expect(JSON.parse(prompt.input)).toEqual(
      expect.objectContaining({
        holdings: [
          expect.objectContaining({
            symbol: "AAPL"
          })
        ],
        quantScenarios: ["분할 매수 관찰"]
      })
    );
  });

  it("parses valid structured report output", () => {
    const parsed = parseDailyReportStructuredOutput(
      JSON.stringify({
        oneLineSummary: "시장 지표와 보유 종목 기준으로 핵심 흐름을 정리했습니다.",
        keyIndicatorBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
        holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
        articleSummaryBullets: ["Apple 관련 핵심 기사는 아직 제품 기대감이 유지된다는 점에 초점을 두고 있습니다."],
        strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
        riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."]
      })
    );

    expect(parsed).toEqual({
      oneLineSummary: "시장 지표와 보유 종목 기준으로 핵심 흐름을 정리했습니다.",
      keyIndicatorBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
      holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
      articleSummaryBullets: ["Apple 관련 핵심 기사는 아직 제품 기대감이 유지된다는 점에 초점을 두고 있습니다."],
      strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
      riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."]
    });
  });

  it("throws on invalid report output", () => {
    expect(() =>
      parseDailyReportStructuredOutput(
        JSON.stringify({
          oneLineSummary: "x",
          keyIndicatorBullets: [],
          holdingTrendBullets: [],
          articleSummaryBullets: "bad",
          strategyBullets: [],
          riskBullets: []
        })
      )
    ).toThrow("Daily report structured output is invalid");
  });
});
