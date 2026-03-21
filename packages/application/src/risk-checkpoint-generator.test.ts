import { describe, expect, it } from "vitest";

import { generateRiskCheckpoints } from "./risk-checkpoint-generator.js";

describe("generateRiskCheckpoints", () => {
  it("adds market and signal driven risk reminders", () => {
    const checkpoints = generateRiskCheckpoints({
      marketRegime: "stressed",
      signals: [
        {
          bias: "bearish",
          companyName: "Tesla",
          confidence: "high",
          exchange: "NASDAQ",
          summary: "breakdown",
          symbol: "TSLA",
          type: "trend_breakdown"
        },
        {
          bias: "neutral",
          companyName: "Tesla",
          confidence: "medium",
          exchange: "NASDAQ",
          summary: "volatility",
          symbol: "TSLA",
          type: "volatility_caution"
        }
      ]
    });

    expect(checkpoints).toEqual(
      expect.arrayContaining([
        "시장 변동성이 높아 현금 비중과 손절 기준을 평소보다 보수적으로 잡는 편이 좋습니다.",
        "Tesla는 장기 추세 하방 이탈 여부를 다시 확인하는 편이 좋습니다.",
        "Tesla는 이벤트 전후 갭 리스크를 감안해 포지션 크기를 줄이는 편이 좋습니다."
      ])
    );
  });
});
