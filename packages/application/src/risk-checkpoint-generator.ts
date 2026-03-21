import type { MarketRegime, QuantSignal } from "./quant-signal-engine.js";

export function generateRiskCheckpoints(input: {
  marketRegime?: MarketRegime;
  signals: QuantSignal[];
}): string[] {
  const checkpoints = new Set<string>();
  const marketRegime = input.marketRegime ?? "elevated";

  if (marketRegime === "stressed") {
    checkpoints.add("시장 변동성이 높아 현금 비중과 손절 기준을 평소보다 보수적으로 잡아.");
  }

  for (const signal of input.signals) {
    if (signal.type === "trend_breakdown") {
      checkpoints.add(`${signal.companyName}는 장기 추세 하방 이탈 여부를 다시 확인해.`);
    }

    if (signal.type === "volatility_caution") {
      checkpoints.add(`${signal.companyName}는 이벤트 전후 갭 리스크를 감안해 포지션 크기를 줄여.`);
    }

    if (signal.type === "volume_breakout_watch" && signal.bias === "bearish") {
      checkpoints.add(`${signal.companyName}는 거래량 동반 하락이라 급락 추세 전환을 경계해.`);
    }
  }

  return [...checkpoints];
}
