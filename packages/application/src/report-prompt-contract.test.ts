import { describe, expect, it } from "vitest";

import {
  buildDailyReportPromptContract,
  parseDailyReportStructuredOutput
} from "./report-prompt-contract.js";

describe("report prompt contract", () => {
  it("builds a JSON-only prompt contract", () => {
    const prompt = buildDailyReportPromptContract({
      marketResults: [],
      newsBriefs: [],
      quantScenarios: ["분할 매수 관찰"],
      riskCheckpoints: ["손절 기준 재점검"],
      runDate: "2026-03-20"
    });

    expect(prompt.instructions).toContain("반드시 JSON 객체만 반환해");
    expect(prompt.metadata).toEqual({
      promptKind: "market-report-composition",
      runDate: "2026-03-20"
    });
    expect(JSON.parse(prompt.input)).toEqual(
      expect.objectContaining({
        quantScenarios: ["분할 매수 관찰"]
      })
    );
  });

  it("parses valid structured report output", () => {
    const parsed = parseDailyReportStructuredOutput(
      JSON.stringify({
        oneLineSummary: "시장 반등 흐름이 이어지고 있어.",
        macroSummary: "지표는 대체로 강세야.",
        portfolioBullets: ["Apple 신제품 기대가 높아."],
        strategyBullets: ["추세 유지 시 분할 매수 관찰"],
        riskBullets: ["변동성 급등에 유의"]
      })
    );

    expect(parsed).toEqual({
      oneLineSummary: "시장 반등 흐름이 이어지고 있어.",
      macroSummary: "지표는 대체로 강세야.",
      portfolioBullets: ["Apple 신제품 기대가 높아."],
      strategyBullets: ["추세 유지 시 분할 매수 관찰"],
      riskBullets: ["변동성 급등에 유의"]
    });
  });

  it("throws on invalid report output", () => {
    expect(() =>
      parseDailyReportStructuredOutput(
        JSON.stringify({
          oneLineSummary: "x",
          macroSummary: "y",
          portfolioBullets: "bad",
          strategyBullets: [],
          riskBullets: []
        })
      )
    ).toThrow("Daily report structured output is invalid");
  });
});
