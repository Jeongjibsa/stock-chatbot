import { describe, expect, it } from "vitest";

import { generateStrategyScenarios } from "./strategy-scenario-generator.js";

describe("generateStrategyScenarios", () => {
  it("maps quant signals into user facing strategy lines", () => {
    const scenarios = generateStrategyScenarios({
      signals: [
        {
          bias: "bullish",
          companyName: "Apple",
          confidence: "high",
          exchange: "NASDAQ",
          summary: "trend",
          symbol: "AAPL",
          type: "trend_follow"
        },
        {
          bias: "neutral",
          companyName: "Apple",
          confidence: "medium",
          exchange: "NASDAQ",
          summary: "volatility",
          symbol: "AAPL",
          type: "volatility_caution"
        }
      ]
    });

    expect(scenarios).toEqual(
      expect.arrayContaining([
        "Apple는 추세 유지 시 눌림목 구간에서 분할 진입을 관찰하는 전략이 적절합니다.",
        "Apple는 변동성이 높아서 신규 진입보다 기존 포지션 관리 중심으로 접근하는 편이 적절합니다."
      ])
    );
  });
});
