import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief } from "./news.js";
import type { QuantAction, QuantScorecard } from "./quant-scorecard.js";
import type { PersonalizedPortfolioRebalancingData } from "./rebalancing-contract.js";

export const DEFAULT_PERSONAL_REBALANCING_SNAPSHOT_VERSION = "v1";

type HoldingInput = {
  changePercent?: number;
  companyName: string;
  currentPrice?: number;
  exchange: string;
  previousClose?: number;
  symbol: string;
};

export function buildPersonalRebalancingSnapshot(input: {
  holdings: HoldingInput[];
  marketResults: MarketDataFetchResult[];
  portfolioNewsBriefs: HoldingNewsBrief[];
  quantScorecards: QuantScorecard[];
}): PersonalizedPortfolioRebalancingData {
  const marketMap = new Map(
    input.marketResults.flatMap((result) =>
      result.status === "ok" ? [[result.data.itemCode, result.data]] : []
    )
  );
  const scorecardMap = new Map(
    input.quantScorecards.map((scorecard) => [scorecard.companyName, scorecard])
  );
  const newsMap = new Map(
    input.portfolioNewsBriefs.map((brief) => [brief.holding.symbol, brief])
  );
  const holdingSnapshots = input.holdings.map((holding) => {
    const scorecard = scorecardMap.get(holding.companyName);
    const finalAction = translateQuantAction(scorecard?.action);
    const eventCount = newsMap.get(holding.symbol)?.events.length ?? 0;
    const intrinsicValueScore = toHundredScale(
      (scorecard?.macroScore ?? 0) * 0.75 + (scorecard?.eventScore ?? 0) * 0.25
    );
    const priceTrendScore = toHundredScale(
      (scorecard?.trendScore ?? 0) * 0.6 + (scorecard?.flowScore ?? 0) * 0.4
    );
    const futureExpectationScore = toHundredScale(
      (scorecard?.eventScore ?? 0) * 0.7 + (scorecard?.trendScore ?? 0) * 0.3
    );
    const portfolioFitScore = guessPortfolioFitScore(scorecard);
    const hardRules = buildHoldingHardRules(finalAction, scorecard, eventCount);
    const constraints = hardRules
      .map((rule) => rule.reason)
      .filter((reason): reason is string => Boolean(reason));

    return {
      name: holding.companyName,
      finalAction,
      intrinsicValueScore,
      priceTrendScore,
      futureExpectationScore,
      portfolioFitScore,
      oneLineJudgment: buildOneLineJudgment({
        finalAction,
        constraints,
        ...(scorecard ? { scorecard } : {})
      }),
      guide: buildGuide(finalAction, scorecard, holding),
      ...(constraints.length > 0 ? { constraints } : {}),
      ...(hardRules.length > 0 ? { hardRules } : {})
    };
  });

  const byAction = {
    increase: holdingSnapshots
      .filter((holding) => holding.finalAction.includes("확대"))
      .map((holding) => holding.name),
    hold: holdingSnapshots
      .filter((holding) => holding.finalAction.includes("유지"))
      .map((holding) => holding.name),
    reduce: holdingSnapshots
      .filter(
        (holding) =>
          holding.finalAction.includes("축소") || holding.finalAction.includes("교체")
      )
      .map((holding) => holding.name),
    watch: holdingSnapshots
      .filter((holding) => holding.finalAction.includes("관찰"))
      .map((holding) => holding.name)
  };

  return {
    selectedProfile: "balanced",
    rebalancingSummary: {
      increaseCandidates: byAction.increase,
      holdCandidates: byAction.hold,
      reduceCandidates: byAction.reduce,
      watchCandidates: byAction.watch
    },
    portfolioSummary: {
      holdingCount: input.holdings.length,
      increaseCount: byAction.increase.length,
      holdCount: byAction.hold.length,
      reduceCount: byAction.reduce.length,
      watchCount: byAction.watch.length,
      eventRiskCount: input.portfolioNewsBriefs.filter((brief) => brief.events.length > 0).length
    },
    marketOverlay: buildMarketOverlay(marketMap),
    holdings: holdingSnapshots,
    riskBullets: buildRiskBullets(marketMap, byAction),
    referenceMarketBrief: buildReferenceMarketBrief(marketMap, input.portfolioNewsBriefs)
  };
}

export function buildIndicatorTags(marketResults: MarketDataFetchResult[]): string[] {
  const priorities = [
    ["KOSPI", "KOSPI"],
    ["KOSDAQ", "KOSDAQ"],
    ["SP500", "S&P500"],
    ["NASDAQ", "NASDAQ"]
  ] as const;
  const marketMap = new Map(
    marketResults.flatMap((result) =>
      result.status === "ok" ? [[result.data.itemCode, result.data]] : []
    )
  );

  return priorities.flatMap(([itemCode, label]) => {
    const item = marketMap.get(itemCode);

    if (!item || item.changePercent === undefined) {
      return [];
    }

    return [`${label} ${formatPercent(item.changePercent)}`];
  });
}

function buildMarketOverlay(
  marketMap: Map<string, Extract<MarketDataFetchResult, { status: "ok" }>["data"]>
): NonNullable<PersonalizedPortfolioRebalancingData["marketOverlay"]> {
  const krAverage = average([
    marketMap.get("KOSPI")?.changePercent,
    marketMap.get("KOSDAQ")?.changePercent
  ]);
  const usAverage = average([
    marketMap.get("NASDAQ")?.changePercent,
    marketMap.get("SP500")?.changePercent,
    marketMap.get("DOW")?.changePercent
  ]);
  const composite = average([krAverage, usAverage]);
  const vix = marketMap.get("VIX")?.changePercent;
  const defensive = (vix ?? 0) >= 5 || composite <= -0.8;
  const selective = !defensive && composite >= 0.35;

  return {
    market: "KOSPI",
    marketCompositeLabel: defensive
      ? "방어 우세"
      : selective
        ? "선별 확대 가능"
        : "중립",
    sentimentLabel:
      composite >= 0.5 ? "적정 이상" : composite <= -0.5 ? "보수적" : "적정",
    marketStrengthLabel:
      krAverage >= 0.5 ? "강도 양호" : krAverage <= -0.5 ? "강도 둔화" : "강도 적정",
    marketFundamentalLabel: "점검 필요",
    blackSwanLabel:
      (vix ?? 0) >= 5
        ? "구조 리스크 높음"
        : (vix ?? 0) <= -5
          ? "구조 리스크 낮음"
          : "구조 리스크 보통",
    buffettByMarketLabel: "점검 필요",
    finalMarketRegimeScoreConservative: defensive ? 28 : selective ? 48 : 42,
    finalMarketRegimeScoreBalanced: defensive ? 34 : selective ? 58 : 48,
    finalMarketRegimeScoreAggressive: defensive ? 42 : selective ? 64 : 54
  };
}

function buildRiskBullets(
  marketMap: Map<string, Extract<MarketDataFetchResult, { status: "ok" }>["data"]>,
  byAction: {
    hold: string[];
    increase: string[];
    reduce: string[];
    watch: string[];
  }
): string[] {
  const bullets: string[] = [];
  const vix = marketMap.get("VIX")?.changePercent ?? 0;
  const usdKrw = marketMap.get("USD_KRW")?.changePercent ?? 0;

  if (vix >= 5) {
    bullets.push("변동성 경계가 높아져 종목 간 동조화 리스크를 함께 점검해야 합니다.");
  }

  if (usdKrw >= 0.3) {
    bullets.push("환율 부담이 커질 때는 종목별 변동성보다 전체 포트 노출을 먼저 점검하는 편이 좋습니다.");
  }

  if (byAction.reduce.length > 0) {
    bullets.push("축소 의견 종목은 반등 기대보다 비중 정상화 우선 여부를 먼저 확인해 주세요.");
  }

  if (byAction.increase.length > 0 && bullets.length < 3) {
    bullets.push("확대 후보가 있더라도 한 번에 늘리기보다 분할 접근이 더 자연스럽습니다.");
  }

  return bullets.slice(0, 3);
}

function buildReferenceMarketBrief(
  marketMap: Map<string, Extract<MarketDataFetchResult, { status: "ok" }>["data"]>,
  portfolioNewsBriefs: HoldingNewsBrief[]
): NonNullable<PersonalizedPortfolioRebalancingData["referenceMarketBrief"]> {
  const kospi = marketMap.get("KOSPI")?.changePercent;
  const kosdaq = marketMap.get("KOSDAQ")?.changePercent;
  const us10y = marketMap.get("US10Y")?.changePercent;
  const usdKrw = marketMap.get("USD_KRW")?.changePercent;
  const newsEventCount = portfolioNewsBriefs.reduce(
    (count, brief) => count + brief.events.length,
    0
  );

  return {
    macroSummary:
      us10y !== undefined || usdKrw !== undefined
        ? `금리와 환율 흐름은 여전히 시장 해석에 영향을 주고 있습니다. 미국 10년물과 원달러 움직임을 함께 점검할 필요가 있습니다.`
        : "거시 변수는 금리와 환율 흐름 중심으로 계속 점검하는 편이 적절합니다.",
    flowSummary:
      kospi !== undefined || kosdaq !== undefined
        ? `국내 지수 흐름은 KOSPI ${formatPercent(kospi)} / KOSDAQ ${formatPercent(kosdaq)} 수준으로, 종목별 차별화 해석이 필요합니다.`
        : "지수보다 종목별 차별화와 상대 강도 확인이 중요한 구간입니다.",
    eventSummary:
      newsEventCount > 0
        ? `보유 종목 관련 이벤트가 ${newsEventCount}건 포착돼 단기 변동성 확인이 필요합니다.`
        : "실적과 거시 일정이 단기 변동성을 키울 수 있어 이벤트 캘린더 점검이 필요합니다."
  };
}

function buildHoldingHardRules(
  finalAction: string,
  scorecard: QuantScorecard | undefined,
  eventCount: number
): Array<{ code?: string; effect?: string; reason?: string }> {
  if (finalAction.includes("축소")) {
    return [
      {
        code: "VOLATILITY_CONTROL",
        effect: "축소 우선",
        reason: "단기 강도보다 포트 변동성 관리와 비중 점검이 우선입니다."
      }
    ];
  }

  if (finalAction.includes("관찰") || eventCount >= 2) {
    return [
      {
        code: "EVENT_CONFIRMATION",
        effect: "관찰 우선",
        reason: "이벤트와 수급 확인 전까지는 방향성 판단을 서두르지 않는 편이 적절합니다."
      }
    ];
  }

  if ((scorecard?.totalScore ?? 0) >= 0.25) {
    return [
      {
        code: "SELECTIVE_EXPANSION",
        effect: "선별 확대",
        reason: "기회가 있더라도 포트 균형을 해치지 않는 범위에서만 접근하는 편이 적절합니다."
      }
    ];
  }

  return [];
}

function buildOneLineJudgment(input: {
  constraints: string[];
  finalAction: string;
  scorecard?: QuantScorecard;
}): string {
  if (input.constraints.length > 0) {
    return input.constraints[0] ?? "제약 요인을 먼저 확인하는 편이 적절합니다.";
  }

  switch (input.finalAction) {
    case "확대 검토":
      return "기본 점수와 흐름이 무너지지 않아 선별적으로 점검할 수 있는 후보입니다.";
    case "유지 우세":
      return "추가 액션보다 기존 포지션 유지와 신호 확인에 무게를 두는 편이 자연스럽습니다.";
    case "일부 축소":
      return "약한 구간을 길게 버티기보다 포트 변동성을 먼저 점검하는 편이 적절합니다.";
    default:
      return (
        input.scorecard?.actionSummary ??
        "지금은 서둘러 결론 내리기보다 방향성을 더 확인하는 편이 좋습니다."
      );
  }
}

function buildGuide(
  finalAction: string,
  scorecard: QuantScorecard | undefined,
  holding: HoldingInput
): string {
  const priceSuffix =
    holding.currentPrice !== undefined
      ? ` 시세 스냅샷은 ${formatValueTransition(
          holding.previousClose,
          holding.currentPrice
        )}${formatChangeSuffix(holding.changePercent)} 기준입니다.`
      : " 시세 스냅샷은 확인 필요합니다.";

  switch (finalAction) {
    case "확대 검토":
      return `추격 매수보다 분할 접근으로 속도를 조절하는 편이 적절합니다.${priceSuffix}`.trim();
    case "유지 우세":
      return `추가 확대보다 기존 보유 유지와 신호 확인에 우선순위를 두는 편이 좋습니다.${priceSuffix}`.trim();
    case "일부 축소":
      return `반등 기대보다 포트 변동성 완화와 비중 정상화 여부를 먼저 점검해 주세요.${priceSuffix}`.trim();
    default:
      return `${scorecard?.actionSummary ?? "확인 신호가 더 필요합니다."}${priceSuffix}`.trim();
  }
}

function translateQuantAction(action?: QuantAction): string {
  switch (action) {
    case "ACCUMULATE":
      return "확대 검토";
    case "REDUCE":
      return "일부 축소";
    case "DEFENSIVE":
      return "관찰 필요";
    default:
      return "유지 우세";
  }
}

function guessPortfolioFitScore(scorecard?: QuantScorecard): number {
  switch (scorecard?.action) {
    case "ACCUMULATE":
      return 72;
    case "REDUCE":
      return 44;
    case "DEFENSIVE":
      return 54;
    default:
      return 66;
  }
}

function toHundredScale(value: number): number {
  return Math.max(0, Math.min(100, Math.round((value + 1) * 50)));
}

function average(values: Array<number | undefined>): number {
  const filtered = values.filter((value): value is number => value !== undefined);

  if (filtered.length === 0) {
    return 0;
  }

  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function formatPercent(value?: number): string {
  if (value === undefined) {
    return "확인 필요";
  }

  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }

  if (value < 0) {
    return `${value.toFixed(2)}%`;
  }

  return "보합";
}

function formatValueTransition(previousValue: number | undefined, value: number): string {
  if (previousValue === undefined) {
    return formatNumber(value);
  }

  return `${formatNumber(previousValue)} → ${formatNumber(value)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2
  }).format(value);
}

function formatChangeSuffix(value?: number): string {
  if (value === undefined) {
    return "";
  }

  if (value > 0) {
    return `, 전일 대비 +${value.toFixed(2)}%`;
  }

  if (value < 0) {
    return `, 전일 대비 ${value.toFixed(2)}%`;
  }

  return ", 전일 대비 보합";
}
