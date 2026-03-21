import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief } from "./news.js";

export type QuantAction = "ACCUMULATE" | "DEFENSIVE" | "HOLD" | "REDUCE";

export type QuantScorecard = {
  action: QuantAction;
  actionSummary: string;
  companyName: string;
  eventScore: number;
  flowScore: number;
  macroScore: number;
  symbol?: string;
  totalScore: number;
  trendScore: number;
};

type HoldingReference = {
  companyName: string;
  exchange: string;
  symbol: string;
};

const EVENT_CONFIDENCE_WEIGHT = {
  low: 0.12,
  medium: 0.2,
  high: 0.3
} as const;

export function buildQuantScorecards(input: {
  holdings: HoldingReference[];
  marketResults: MarketDataFetchResult[];
  portfolioNewsBriefs: HoldingNewsBrief[];
}): QuantScorecard[] {
  const successfulMarketItems = input.marketResults.filter(
    (result): result is Extract<MarketDataFetchResult, { status: "ok" }> =>
      result.status === "ok"
  );
  const marketMap = new Map(
    successfulMarketItems.map((result) => [result.data.itemCode, result.data])
  );

  const macroScore = clampScore(
    scoreVix(marketMap.get("VIX")?.changePercent) +
      scoreDollarPressure(
        marketMap.get("DXY")?.changePercent,
        marketMap.get("USD_KRW")?.changePercent
      ) +
      scoreRates(marketMap.get("US10Y")?.changeValue)
  );
  const trendScore = clampScore(
    scoreTrendAverage([
      weightedChange(marketMap.get("NASDAQ")?.changePercent, 0.35),
      weightedChange(marketMap.get("SP500")?.changePercent, 0.3),
      weightedChange(marketMap.get("DOW")?.changePercent, 0.15),
      weightedChange(marketMap.get("KOSPI")?.changePercent, 0.1),
      weightedChange(marketMap.get("KOSDAQ")?.changePercent, 0.1)
    ])
  );
  const flowScore = clampScore(
    scoreDomesticFlowProxy(
      marketMap.get("KOSPI")?.changePercent,
      marketMap.get("KOSDAQ")?.changePercent,
      marketMap.get("USD_KRW")?.changePercent
    )
  );

  if (input.holdings.length === 0) {
    const totalScore = calculateTotalScore({
      macroScore,
      trendScore,
      eventScore: 0,
      flowScore
    });

    return [
      {
        companyName: "시장 기준",
        macroScore,
        trendScore,
        eventScore: 0,
        flowScore,
        totalScore,
        action: resolveAction(totalScore),
        actionSummary: buildActionSummary(resolveAction(totalScore), "시장 기준")
      }
    ];
  }

  const briefMap = new Map(
    input.portfolioNewsBriefs.map((brief) => [brief.holding.symbol, brief])
  );

  return input.holdings.map((holding) => {
    const eventScore = clampScore(scoreHoldingEvents(briefMap.get(holding.symbol)));
    const totalScore = calculateTotalScore({
      macroScore,
      trendScore,
      eventScore,
      flowScore
    });
    const action = resolveAction(totalScore);

    return {
      companyName: holding.companyName,
      symbol: holding.symbol,
      macroScore,
      trendScore,
      eventScore,
      flowScore,
      totalScore,
      action,
      actionSummary: buildActionSummary(action, holding.companyName)
    };
  });
}

export function toQuantStrategyBullets(scorecards: QuantScorecard[]): string[] {
  return scorecards.map(
    (scorecard) =>
      `${scorecard.companyName} 기준 Total ${formatSignedScore(scorecard.totalScore)}로 ${scorecard.action} 의견이며, ${scorecard.actionSummary}`
  );
}

function scoreVix(changePercent?: number): number {
  if (changePercent === undefined) {
    return 0;
  }

  if (changePercent >= 10) {
    return -0.35;
  }

  if (changePercent >= 5) {
    return -0.25;
  }

  if (changePercent <= -10) {
    return 0.2;
  }

  if (changePercent <= -5) {
    return 0.1;
  }

  return 0;
}

function scoreDollarPressure(
  dxyChangePercent?: number,
  usdKrwChangePercent?: number
): number {
  let score = 0;

  if (dxyChangePercent !== undefined) {
    if (dxyChangePercent >= 0.5) {
      score -= 0.15;
    } else if (dxyChangePercent <= -0.5) {
      score += 0.1;
    }
  }

  if (usdKrwChangePercent !== undefined) {
    if (usdKrwChangePercent >= 0.3) {
      score -= 0.1;
    } else if (usdKrwChangePercent <= -0.3) {
      score += 0.05;
    }
  }

  return score;
}

function scoreRates(changeValue?: number): number {
  if (changeValue === undefined) {
    return 0;
  }

  if (changeValue >= 0.05) {
    return -0.15;
  }

  if (changeValue <= -0.05) {
    return 0.1;
  }

  return 0;
}

function scoreTrendAverage(changes: number[]): number {
  const total = changes.reduce((sum, value) => sum + value, 0);

  if (total <= -1.2) {
    return -0.6;
  }

  if (total <= -0.5) {
    return -0.4;
  }

  if (total >= 1.2) {
    return 0.6;
  }

  if (total >= 0.5) {
    return 0.4;
  }

  return 0;
}

function scoreDomesticFlowProxy(
  kospiChangePercent?: number,
  kosdaqChangePercent?: number,
  usdKrwChangePercent?: number
): number {
  const domesticStrength =
    (kospiChangePercent ?? 0) * 0.55 + (kosdaqChangePercent ?? 0) * 0.45;

  if (domesticStrength >= 0.8 && (usdKrwChangePercent ?? 0) <= 0.3) {
    return 0.25;
  }

  if (domesticStrength <= -0.8 && (usdKrwChangePercent ?? 0) >= 0.3) {
    return -0.3;
  }

  if (domesticStrength >= 0.3) {
    return 0.1;
  }

  if (domesticStrength <= -0.3) {
    return -0.1;
  }

  return 0;
}

function scoreHoldingEvents(brief?: HoldingNewsBrief): number {
  if (!brief || brief.events.length === 0) {
    return 0;
  }

  return brief.events.slice(0, 3).reduce((sum, event) => {
    const weight = EVENT_CONFIDENCE_WEIGHT[event.confidence];

    if (event.sentiment === "positive") {
      return sum + weight;
    }

    if (event.sentiment === "negative") {
      return sum - weight;
    }

    return sum;
  }, 0);
}

function calculateTotalScore(input: {
  macroScore: number;
  trendScore: number;
  eventScore: number;
  flowScore: number;
}): number {
  return roundScore(
    input.macroScore * 0.35 +
      input.trendScore * 0.3 +
      input.eventScore * 0.2 +
      input.flowScore * 0.15
  );
}

function resolveAction(totalScore: number): QuantAction {
  if (totalScore >= 0.25) {
    return "ACCUMULATE";
  }

  if (totalScore <= -0.4) {
    return "DEFENSIVE";
  }

  if (totalScore <= -0.15) {
    return "REDUCE";
  }

  return "HOLD";
}

function buildActionSummary(action: QuantAction, companyName: string): string {
  switch (action) {
    case "ACCUMULATE":
      return `${companyName}는 추격 매수보다 분할 접근으로 비중 확대를 검토하시는 편이 좋습니다.`;
    case "DEFENSIVE":
      return `${companyName}는 신규 매수를 제한하고 기존 비중 점검을 우선하시는 편이 좋습니다.`;
    case "REDUCE":
      return `${companyName}는 반등 시 비중 축소 또는 손절 기준 재점검이 우선입니다.`;
    case "HOLD":
      return `${companyName}는 성급한 추가 매수보다 관망 또는 소규모 분할 접근이 적절합니다.`;
  }
}

function weightedChange(changePercent: number | undefined, weight: number): number {
  return (changePercent ?? 0) * weight;
}

function clampScore(score: number): number {
  return roundScore(Math.min(1, Math.max(-1, score)));
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}

function formatSignedScore(score: number): string {
  return score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
}
