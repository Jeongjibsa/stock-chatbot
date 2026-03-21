import { describe, expect, it } from "vitest";

import { evaluateQuantSignals } from "./quant-signal-engine.js";

describe("evaluateQuantSignals", () => {
  it("produces trend, volume and volatility signals", () => {
    const signals = evaluateQuantSignals({
      marketRegime: "elevated",
      holdings: [
        {
          aboveLongMovingAverage: true,
          aboveShortMovingAverage: true,
          changePercent1d: 3.2,
          companyName: "Apple",
          exchange: "NASDAQ",
          momentum20d: 8,
          symbol: "AAPL",
          volatilityPercentile: 85,
          volumeRatio: 2
        }
      ]
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "trend_follow",
          bias: "bullish"
        }),
        expect.objectContaining({
          type: "volume_breakout_watch"
        }),
        expect.objectContaining({
          type: "volatility_caution"
        })
      ])
    );
  });

  it("produces bearish breakdown signals", () => {
    const signals = evaluateQuantSignals({
      holdings: [
        {
          aboveLongMovingAverage: false,
          aboveShortMovingAverage: false,
          changePercent1d: -4,
          companyName: "Tesla",
          exchange: "NASDAQ",
          momentum20d: -9,
          symbol: "TSLA"
        }
      ]
    });

    expect(signals).toEqual([
      expect.objectContaining({
        type: "trend_breakdown",
        bias: "bearish",
        symbol: "TSLA"
      })
    ]);
  });
});
