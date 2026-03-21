import type { QuantSignal } from "./quant-signal-engine.js";

export function generateStrategyScenarios(input: {
  signals: QuantSignal[];
}): string[] {
  const scenarios = new Set<string>();

  for (const signal of input.signals) {
    switch (signal.type) {
      case "trend_follow":
        scenarios.add(
          `${signal.companyName}는 추세 유지 시 눌림목 구간에서 분할 진입을 관찰해.`
        );
        break;
      case "momentum_rebound_watch":
        scenarios.add(
          `${signal.companyName}는 반등 확인 전까지 소규모 탐색 또는 관망 시나리오가 적절해.`
        );
        break;
      case "trend_breakdown":
        scenarios.add(
          `${signal.companyName}는 추세 훼손 상태라 비중 축소 또는 손절 기준 재점검이 우선이야.`
        );
        break;
      case "volume_breakout_watch":
        scenarios.add(
          `${signal.companyName}는 거래량 확대가 확인돼 돌파 지속 여부를 하루 더 확인하는 시나리오가 좋아.`
        );
        break;
      case "volatility_caution":
        scenarios.add(
          `${signal.companyName}는 변동성이 높아서 신규 진입보다 기존 포지션 관리 중심으로 접근해.`
        );
        break;
    }
  }

  return [...scenarios];
}
