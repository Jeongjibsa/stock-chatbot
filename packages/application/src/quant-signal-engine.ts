export type HoldingQuantSnapshot = {
  aboveLongMovingAverage: boolean;
  aboveShortMovingAverage: boolean;
  changePercent1d: number;
  companyName: string;
  exchange: string;
  momentum20d: number;
  symbol: string;
  volatilityPercentile?: number;
  volumeRatio?: number;
};

export type MarketRegime = "calm" | "elevated" | "stressed";
export type QuantSignalBias = "bearish" | "bullish" | "neutral";
export type QuantSignalConfidence = "high" | "low" | "medium";
export type QuantSignalType =
  | "momentum_rebound_watch"
  | "trend_breakdown"
  | "trend_follow"
  | "volatility_caution"
  | "volume_breakout_watch";

export type QuantSignal = {
  bias: QuantSignalBias;
  companyName: string;
  confidence: QuantSignalConfidence;
  exchange: string;
  summary: string;
  symbol: string;
  type: QuantSignalType;
};

export function evaluateQuantSignals(input: {
  holdings: HoldingQuantSnapshot[];
  marketRegime?: MarketRegime;
}): QuantSignal[] {
  const marketRegime = input.marketRegime ?? "elevated";
  const signals: QuantSignal[] = [];

  for (const holding of input.holdings) {
    if (
      holding.aboveShortMovingAverage &&
      holding.aboveLongMovingAverage &&
      holding.momentum20d >= 5
    ) {
      signals.push({
        type: "trend_follow",
        bias: "bullish",
        confidence: marketRegime === "stressed" ? "medium" : "high",
        companyName: holding.companyName,
        exchange: holding.exchange,
        symbol: holding.symbol,
        summary: `${holding.companyName}는 중기 추세가 살아 있고 최근 20일 모멘텀이 유지되고 있어.`
      });
    }

    if (
      !holding.aboveLongMovingAverage &&
      holding.changePercent1d <= -3 &&
      holding.momentum20d <= -5
    ) {
      signals.push({
        type: "trend_breakdown",
        bias: "bearish",
        confidence: "high",
        companyName: holding.companyName,
        exchange: holding.exchange,
        symbol: holding.symbol,
        summary: `${holding.companyName}는 장기 추세 아래에서 약세가 이어지고 있어 방어적으로 볼 필요가 있어.`
      });
    }

    if (
      holding.aboveShortMovingAverage &&
      !holding.aboveLongMovingAverage &&
      holding.momentum20d >= 0
    ) {
      signals.push({
        type: "momentum_rebound_watch",
        bias: "bullish",
        confidence: "medium",
        companyName: holding.companyName,
        exchange: holding.exchange,
        symbol: holding.symbol,
        summary: `${holding.companyName}는 단기 반등 시도가 보이지만 아직 장기 추세 회복은 확인되지 않았어.`
      });
    }

    if (holding.volumeRatio !== undefined && holding.volumeRatio >= 1.8) {
      signals.push({
        type: "volume_breakout_watch",
        bias: holding.changePercent1d >= 0 ? "bullish" : "bearish",
        confidence: "medium",
        companyName: holding.companyName,
        exchange: holding.exchange,
        symbol: holding.symbol,
        summary: `${holding.companyName}는 거래량이 평소보다 크게 늘어 방향성 확인이 필요해.`
      });
    }

    if (
      holding.volatilityPercentile !== undefined &&
      holding.volatilityPercentile >= 80
    ) {
      signals.push({
        type: "volatility_caution",
        bias: "neutral",
        confidence: holding.volatilityPercentile >= 90 ? "high" : "medium",
        companyName: holding.companyName,
        exchange: holding.exchange,
        symbol: holding.symbol,
        summary: `${holding.companyName}는 변동성이 높은 구간이라 포지션 크기 조절이 필요해.`
      });
    }
  }

  return signals;
}
