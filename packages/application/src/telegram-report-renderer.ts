import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief } from "./news.js";
import type { QuantAction, QuantScorecard } from "./quant-scorecard.js";
import {
  formatMarketRegimeLabel,
  formatPortfolioFitLabel,
  formatStockViewLabel,
  type HoldingRebalancingSnapshot,
  type PersonalizedPortfolioRebalancingData,
  type ProfileType
} from "./rebalancing-contract.js";

export type TelegramReportRenderInput = {
  articleSummaryBullets?: string[];
  displayName: string;
  eventBullets?: string[];
  fundFlowBullets?: string[];
  holdingTrendBullets?: string[];
  holdings: Array<{
    changePercent?: number;
    companyName: string;
    currentPrice?: number;
    exchange: string;
    previousClose?: number;
    symbol: string;
    trendSummary?: string;
  }>;
  keyIndicatorSummaries?: string[];
  macroBullets?: string[];
  marketBullets?: string[];
  marketResults: MarketDataFetchResult[];
  portfolioNewsBriefs?: HoldingNewsBrief[];
  portfolioRebalancing?: PersonalizedPortfolioRebalancingData;
  publicBriefingUrl?: string;
  quantScorecards?: QuantScorecard[];
  quantScenarios?: string[];
  reportDetailLevel?: "compact" | "standard";
  riskCheckpoints?: string[];
  runDate: string;
  summaryLine?: string;
};

type ActionBucket = "hold" | "increase" | "reduce" | "watch";

export function renderTelegramDailyReport(
  input: TelegramReportRenderInput
): string {
  const failedMarketItems = input.marketResults.filter(
    (result): result is Extract<MarketDataFetchResult, { status: "error" }> =>
      result.status === "error"
  );
  const selectedProfile = input.portfolioRebalancing?.selectedProfile ?? "balanced";
  const rebalancingSummary = buildRebalancingSummary(input);
  const portfolioSummary = buildPortfolioSummary(input, rebalancingSummary);
  const marketSummary = buildMarketSummary(input, selectedProfile, failedMarketItems.length);
  const profileInterpretations = buildProfileInterpretations(input, marketSummary.tone);
  const holdingGuides = buildHoldingGuides(input, marketSummary.tone);
  const riskBullets = buildRiskBullets(input, failedMarketItems);
  const referenceBrief = buildReferenceBrief(input);
  const conclusion = buildConclusion(input, marketSummary.tone, failedMarketItems.length);
  const lines: string[] = [
    `1. 🗞️ 오늘의 포트폴리오 리밸런싱 브리핑 (${input.runDate})`,
    "",
    "2. 📌 오늘 한 줄 결론",
    `- ${conclusion}`,
    "",
    "3. 🎯 오늘의 리밸런싱 제안",
    `- 비중 확대 검토: ${formatCompanyList(rebalancingSummary.increase, "현재 뚜렷한 후보 없음")}`,
    `- 유지 우세: ${formatCompanyList(rebalancingSummary.hold, "선별 관찰 우선")}`,
    `- 비중 조절 필요: ${formatCompanyList(rebalancingSummary.reduce, "비중 점검 우선")}`,
    `- 우선 관찰 대상: ${formatCompanyList(rebalancingSummary.watch, "현재 뚜렷한 후보 없음")}`,
    "",
    "4. 🧩 성향별 해석",
    `- 🛡️ 보수적: ${profileInterpretations.conservative}`,
    `- ⚖️ 중립적: ${profileInterpretations.balanced}`,
    `- 🚀 공격적: ${profileInterpretations.aggressive}`,
    "",
    "5. 📦 내 포트폴리오 요약",
    `- 보유 종목: ${formatCount(portfolioSummary.holdingCount, "확인 필요")}`,
    `- 확대 의견: ${formatCount(portfolioSummary.increaseCount, "확인 필요")}`,
    `- 유지 의견: ${formatCount(portfolioSummary.holdCount, "확인 필요")}`,
    `- 관찰 의견: ${formatCount(portfolioSummary.watchCount, "확인 필요")}`,
    `- 축소 의견: ${formatCount(portfolioSummary.reduceCount, "확인 필요")}`,
    `- 이벤트 주의 종목: ${formatCount(portfolioSummary.eventRiskCount, "점검 필요")}`,
    "",
    "6. 🌡️ 시장 레짐 요약",
    `- 시장 종합: ${marketSummary.overall}`,
    `- 심리/강도: ${marketSummary.sentimentStrength}`,
    `- 밸류/펀더멘털: ${marketSummary.valuation}`,
    `- 구조 리스크: ${marketSummary.structureRisk}`,
    `- 한줄 해석: ${marketSummary.interpretation}`,
    "",
    "7. 📈 종목별 리밸런싱 가이드"
  ];

  if (holdingGuides.length === 0) {
    lines.push("- 현재 보유 종목 데이터가 없어 종목별 가이드는 점검 필요 상태입니다.");
  } else {
    for (const holding of holdingGuides) {
      lines.push(`[${holding.name}]`);
      lines.push(`- 최종 의견: ${holding.finalAction}`);
      lines.push(`- 한줄 판단: ${holding.oneLine}`);
      lines.push(`- 내재 가치: ${holding.intrinsicValue}`);
      lines.push(`- 가격/추세: ${holding.priceTrend}`);
      lines.push(`- 미래 기대치: ${holding.futureExpectation}`);
      lines.push(`- 포트 적합성: ${holding.portfolioFit}`);

      if (holding.constraint) {
        lines.push(`- 제약 요인: ${holding.constraint}`);
      }

      lines.push(`- 가이드: ${holding.guide}`);
      lines.push("");
    }

    if (lines.at(-1) === "") {
      lines.pop();
    }
  }

  lines.push(
    "",
    "8. ⚠️ 오늘의 포트 리스크 체크",
    ...riskBullets.map((bullet) => `- ${bullet}`),
    "",
    "9. 🌍 참고용 시장 브리핑",
    `- 거시 요약: ${referenceBrief.macroSummary}`,
    `- 자금 흐름: ${referenceBrief.flowSummary}`,
    `- 핵심 이벤트: ${referenceBrief.eventSummary}`,
    "",
    "10. 🔎 공개 상세 브리핑",
    input.publicBriefingUrl ?? "확인 필요",
    "",
    "11. ❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다."
  );

  return lines.join("\n");
}

function buildConclusion(
  input: TelegramReportRenderInput,
  tone: "defensive" | "neutral" | "selective",
  failedMarketItemCount: number
): string {
  if (input.summaryLine) {
    return stripArrow(input.summaryLine);
  }

  if (tone === "defensive") {
    return failedMarketItemCount > 0
      ? "시장 리스크 점검이 우선이며 일부 지표는 지연돼 있어, 오늘은 신규 확대보다 유지와 선별 조정에 무게를 두는 편이 적절합니다."
      : "시장 해석이 방어적으로 기울어 있어, 오늘은 신규 확대보다 유지와 선별 조정에 무게를 두는 편이 적절합니다.";
  }

  if (tone === "selective") {
    return "개별 종목 기회는 남아 있지만 전체 시장이 공격적 확대를 정당화하진 않아, 선택적 유지와 제한적 확대 검토가 적절합니다.";
  }

  return failedMarketItemCount > 0
    ? "현재 확보된 데이터 기준으로는 종목별 선별 대응이 가능하지만 일부 시장 지표는 추가 확인이 필요합니다."
    : "현재 확보된 데이터 기준으로는 종목별 선별 대응이 가능하며, 무리한 추격보다 포트 균형 점검이 우선입니다.";
}

function buildRebalancingSummary(input: TelegramReportRenderInput): {
  hold: string[];
  increase: string[];
  reduce: string[];
  watch: string[];
} {
  const snapshot = input.portfolioRebalancing?.rebalancingSummary;

  if (snapshot) {
    return {
      increase: snapshot.increaseCandidates ?? [],
      hold: snapshot.holdCandidates ?? [],
      reduce: snapshot.reduceCandidates ?? [],
      watch: snapshot.watchCandidates ?? []
    };
  }

  const buckets = {
    increase: [] as string[],
    hold: [] as string[],
    reduce: [] as string[],
    watch: [] as string[]
  };

  for (const scorecard of input.quantScorecards ?? []) {
    const bucket = toActionBucket(undefined, scorecard.action);
    buckets[bucket].push(scorecard.companyName);
  }

  return buckets;
}

function buildPortfolioSummary(
  input: TelegramReportRenderInput,
  rebalancingSummary: {
    hold: string[];
    increase: string[];
    reduce: string[];
    watch: string[];
  }
): {
  eventRiskCount?: number | null;
  holdingCount?: number | null;
  holdCount?: number | null;
  increaseCount?: number | null;
  reduceCount?: number | null;
  watchCount?: number | null;
} {
  const snapshot = input.portfolioRebalancing?.portfolioSummary;

  if (snapshot) {
    return {
      eventRiskCount: snapshot.eventRiskCount ?? null,
      holdingCount: snapshot.holdingCount ?? null,
      holdCount: snapshot.holdCount ?? null,
      increaseCount: snapshot.increaseCount ?? null,
      reduceCount: snapshot.reduceCount ?? null,
      watchCount: snapshot.watchCount ?? null
    };
  }

  return {
    holdingCount: input.holdings.length,
    increaseCount: rebalancingSummary.increase.length,
    holdCount: rebalancingSummary.hold.length,
    watchCount: rebalancingSummary.watch.length,
    reduceCount: rebalancingSummary.reduce.length,
    eventRiskCount: null
  };
}

function buildMarketSummary(
  input: TelegramReportRenderInput,
  selectedProfile: ProfileType,
  failedMarketItemCount: number
): {
  interpretation: string;
  overall: string;
  sentimentStrength: string;
  structureRisk: string;
  tone: "defensive" | "neutral" | "selective";
  valuation: string;
} {
  const overlay = input.portfolioRebalancing?.marketOverlay;
  const marketBullets = input.marketBullets ?? [];
  const riskBullets = input.riskCheckpoints ?? [];
  const highRiskOverlay =
    isHighRiskLabel(overlay?.blackSwanLabel) &&
    isHighRiskLabel(overlay?.marketFundamentalLabel) &&
    isExtremeValuationLabel(overlay?.buffettByMarketLabel);
  const tone: "defensive" | "neutral" | "selective" = highRiskOverlay
    ? "defensive"
    : failedMarketItemCount > 0 || riskBullets.length >= 2
      ? "defensive"
      : rebalancingHasIncrease(input)
        ? "selective"
        : "neutral";

  if (overlay) {
    const regimeScore =
      selectedProfile === "conservative"
        ? overlay.finalMarketRegimeScoreConservative
        : selectedProfile === "aggressive"
          ? overlay.finalMarketRegimeScoreAggressive
          : overlay.finalMarketRegimeScoreBalanced;
    const regimeLabel = formatMarketRegimeLabel(regimeScore);
    const overall = overlay.marketCompositeLabel
      ? `${regimeLabel} 구간이며, 시장 종합은 ${overlay.marketCompositeLabel}로 해석됩니다.`
      : `${regimeLabel} 구간으로 해석하는 편이 적절합니다.`;
    const sentimentStrength =
      overlay.sentimentLabel || overlay.marketStrengthLabel
        ? `${overlay.sentimentLabel ?? "심리 점검 필요"} / ${overlay.marketStrengthLabel ?? "강도 점검 필요"}`
        : "심리와 강도 세부 데이터는 점검 필요합니다.";
    const valuation =
      overlay.marketFundamentalLabel || overlay.buffettByMarketLabel
        ? `${overlay.marketFundamentalLabel ?? "펀더멘털 점검 필요"} / ${overlay.buffettByMarketLabel ?? "밸류 점검 필요"}`
        : "밸류와 펀더멘털 세부 데이터는 보강 중입니다.";
    const structureRisk = overlay.blackSwanLabel
      ? overlay.blackSwanLabel
      : "구조 리스크 점검 필요";
    const interpretation = highRiskOverlay
      ? "표면 모멘텀은 유지되더라도 내부 밸류 부담과 구조적 취약성 때문에 방어적으로 읽는 편이 적절합니다."
      : marketBullets[0] ?? stripArrow(input.summaryLine ?? "현재 확보된 시장 데이터 기준으로 핵심 변화만 우선 정리했습니다.");

    return {
      overall,
      sentimentStrength,
      valuation,
      structureRisk,
      interpretation,
      tone
    };
  }

  return {
    overall:
      marketBullets[0] ??
      (tone === "defensive"
        ? "현재 확보된 시장 데이터 기준으로는 방어적 해석이 우세합니다."
        : "현재 확보된 시장 데이터 기준으로는 중립적 해석이 적절합니다."),
    sentimentStrength:
      buildSentimentStrengthFallback(input.marketResults) ??
      "심리와 강도 세부 데이터는 추가 확인이 필요한 구간입니다.",
    valuation: "밸류와 펀더멘털 세부 데이터는 보강 중입니다.",
    structureRisk:
      tone === "defensive"
        ? "현재 확보된 리스크 신호 기준으로는 구조 리스크 점검이 우선입니다."
        : "구조 리스크 세부 데이터는 추가 확인이 필요합니다.",
    interpretation:
      tone === "defensive"
        ? "지수 방향성보다 내부 리스크 관리와 포트 균형 점검을 우선하는 해석이 적절합니다."
        : "표면 흐름은 유지되지만 확신을 키우기엔 데이터 보강이 더 필요한 구간입니다.",
    tone
  };
}

function buildProfileInterpretations(
  input: TelegramReportRenderInput,
  tone: "defensive" | "neutral" | "selective"
): Record<ProfileType, string> {
  const overlay = input.portfolioRebalancing?.marketOverlay;
  const highRiskOverlay =
    isHighRiskLabel(overlay?.blackSwanLabel) &&
    isHighRiskLabel(overlay?.marketFundamentalLabel) &&
    isExtremeValuationLabel(overlay?.buffettByMarketLabel);

  if (highRiskOverlay || tone === "defensive") {
    return {
      conservative:
        "시장 리스크가 높은 구간으로 읽혀 신규 확대보다 비중 관리와 방어적 해석을 우선하는 편이 적절합니다.",
      balanced:
        "핵심 보유 종목은 유지 가능하지만 확대는 선별적으로만 보는 편이 적절합니다.",
      aggressive:
        "추세가 살아 있는 종목은 볼 수 있어도 시장 전체가 추격 확대를 정당화하는 환경은 아닙니다."
    };
  }

  if (tone === "selective") {
    return {
      conservative:
        "추가 확대보다 기존 비중과 리스크 노출을 먼저 점검하는 해석이 더 안전합니다.",
      balanced:
        "핵심 종목 중심으로만 제한적 확대 검토가 가능하고, 나머지는 유지 관점이 적절합니다.",
      aggressive:
        "상대적으로 강한 종목은 넓게 볼 수 있지만 제약 요인이 있는 종목은 그대로 존중해야 합니다."
    };
  }

  return {
    conservative:
      "현재는 공격적 대응보다 기존 포지션 안정성 점검에 우선순위를 두는 해석이 적절합니다.",
    balanced:
      "유지 중심 대응이 기본이며, 확신이 있는 종목만 선별적으로 보는 편이 좋습니다.",
    aggressive:
      "관심 종목 폭은 넓게 가져갈 수 있지만 제약 요인과 이벤트 리스크는 그대로 반영해야 합니다."
  };
}

function buildHoldingGuides(
  input: TelegramReportRenderInput,
  tone: "defensive" | "neutral" | "selective"
): Array<{
  constraint?: string;
  finalAction: string;
  futureExpectation: string;
  guide: string;
  intrinsicValue: string;
  name: string;
  oneLine: string;
  portfolioFit: string;
  priceTrend: string;
}> {
  const holdingsByName = new Map(
    input.portfolioRebalancing?.holdings?.map((holding) => [holding.name, holding]) ?? []
  );
  const scorecardsByName = new Map(
    (input.quantScorecards ?? []).map((scorecard) => [scorecard.companyName, scorecard])
  );

  return input.holdings.map((holding) => {
    const snapshot = holdingsByName.get(holding.companyName);
    const scorecard = scorecardsByName.get(holding.companyName);
    const finalAction =
      snapshot?.finalAction ?? translateQuantAction(scorecard?.action) ?? "관찰 필요";
    const constraint = buildConstraint(snapshot);
    const intrinsicValue = formatStockViewLabel(snapshot?.intrinsicValueScore);
    const priceTrend = formatStockViewLabel(snapshot?.priceTrendScore);
    const futureExpectation = formatStockViewLabel(snapshot?.futureExpectationScore);
    const portfolioFit = formatPortfolioFitLabel(snapshot?.portfolioFitScore);

    return {
      name: holding.companyName,
      finalAction,
      oneLine:
        snapshot?.oneLineJudgment ??
        scorecard?.actionSummary ??
        holding.trendSummary ??
        "현재 확보된 데이터 기준으로는 추가 확인이 필요한 구간입니다.",
      intrinsicValue,
      priceTrend,
      futureExpectation,
      portfolioFit,
      ...(constraint ? { constraint } : {}),
      guide:
        snapshot?.guide ??
        buildGuide(finalAction, tone, holding, scorecard)
    };
  });
}

function buildRiskBullets(
  input: TelegramReportRenderInput,
  failedMarketItems: Array<Extract<MarketDataFetchResult, { status: "error" }>>
): string[] {
  const riskBullets = [
    ...(input.portfolioRebalancing?.riskBullets ?? []),
    ...(input.riskCheckpoints ?? [])
  ];
  const uniqueBullets = [...new Set(riskBullets)];

  if (failedMarketItems.length > 0) {
    uniqueBullets.push("일부 시장 지표는 지연 또는 누락 상태라 추가 확인이 필요합니다.");
  }

  if (uniqueBullets.length > 0) {
    return uniqueBullets.slice(0, 3);
  }

  return ["현재 확보된 데이터 기준으로는 포트 전체 리스크를 한 번 더 점검하는 편이 적절합니다."];
}

function buildReferenceBrief(input: TelegramReportRenderInput): {
  eventSummary: string;
  flowSummary: string;
  macroSummary: string;
} {
  const reference = input.portfolioRebalancing?.referenceMarketBrief;

  return {
    macroSummary:
      reference?.macroSummary ??
      input.macroBullets?.[0] ??
      "현재 확보된 거시 데이터 기준으로 핵심 변화만 우선 정리했습니다.",
    flowSummary:
      reference?.flowSummary ??
      input.fundFlowBullets?.[0] ??
      input.marketBullets?.[0] ??
      "자금 흐름과 시장 리더십은 추가 확인이 필요한 구간입니다.",
    eventSummary:
      reference?.eventSummary ??
      input.eventBullets?.[0] ??
      input.articleSummaryBullets?.[0] ??
      "주요 이벤트 데이터는 보강 중입니다."
  };
}

function buildGuide(
  finalAction: string,
  tone: "defensive" | "neutral" | "selective",
  holding: TelegramReportRenderInput["holdings"][number],
  scorecard?: QuantScorecard
): string {
  const marketSuffix =
    tone === "defensive"
      ? " 시장이 방어적으로 읽히는 만큼 무리한 추격은 피하는 편이 좋습니다."
      : tone === "selective"
        ? " 추가 대응은 선별적으로만 보는 편이 적절합니다."
        : "";
  const snapshotSuffix =
    holding.currentPrice !== undefined
      ? ` 시세 스냅샷은 ${formatValueTransition(holding.previousClose, holding.currentPrice)}${formatChangeSuffix(holding.changePercent)} 기준입니다.`
      : " 시세 스냅샷은 확인 필요합니다.";

  switch (finalAction) {
    case "확대 검토":
    case "적극 확대":
      return `분할 접근 여부를 검토하되 기존 비중과 타 종목 제약을 함께 점검하는 편이 적절합니다.${marketSuffix}${snapshotSuffix}`.trim();
    case "유지 우세":
      return `기존 포지션 유지에 무게를 두고 추가 확대는 신호 확인 뒤 판단하는 편이 좋습니다.${marketSuffix}${snapshotSuffix}`.trim();
    case "일부 축소":
    case "축소 우선":
    case "교체 검토":
      return `포트 변동성 완화와 비중 정상화에 우선순위를 두는 대응이 적절합니다.${marketSuffix}${snapshotSuffix}`.trim();
    default:
      return `${scorecard?.actionSummary ?? "방향 확인 전까지는 신호를 더 점검하는 편이 적절합니다."}${snapshotSuffix}`;
  }
}

function buildConstraint(snapshot?: HoldingRebalancingSnapshot): string | undefined {
  const hardRuleReason = snapshot?.hardRules?.find((item) => item.reason)?.reason;

  if (hardRuleReason) {
    return hardRuleReason;
  }

  if (snapshot?.constraints && snapshot.constraints.length > 0) {
    return snapshot.constraints[0];
  }

  return undefined;
}

function translateQuantAction(action?: QuantAction): string | undefined {
  switch (action) {
    case "ACCUMULATE":
      return "확대 검토";
    case "DEFENSIVE":
      return "관찰 필요";
    case "HOLD":
      return "유지 우세";
    case "REDUCE":
      return "일부 축소";
    default:
      return undefined;
  }
}

function toActionBucket(finalAction?: string, quantAction?: QuantAction): ActionBucket {
  const normalized = finalAction?.trim();

  if (normalized) {
    if (normalized.includes("확대")) {
      return "increase";
    }

    if (normalized.includes("축소") || normalized.includes("교체")) {
      return "reduce";
    }

    if (normalized.includes("관찰")) {
      return "watch";
    }

    if (normalized.includes("유지")) {
      return "hold";
    }
  }

  switch (quantAction) {
    case "ACCUMULATE":
      return "increase";
    case "REDUCE":
      return "reduce";
    case "DEFENSIVE":
      return "watch";
    default:
      return "hold";
  }
}

function rebalancingHasIncrease(input: TelegramReportRenderInput): boolean {
  const summary = input.portfolioRebalancing?.rebalancingSummary;

  if (summary?.increaseCandidates && summary.increaseCandidates.length > 0) {
    return true;
  }

  return (input.quantScorecards ?? []).some((scorecard) => scorecard.action === "ACCUMULATE");
}

function isHighRiskLabel(value?: string): boolean {
  return (
    value === "과열" ||
    value === "구조 리스크 매우 높음" ||
    value === "구조 리스크 높음" ||
    value === "매우 위험" ||
    value === "위험"
  );
}

function isExtremeValuationLabel(value?: string): boolean {
  return value === "매우 고평가" || value === "극단적 고평가";
}

function buildSentimentStrengthFallback(
  results: MarketDataFetchResult[]
): string | undefined {
  const marketMap = new Map(
    results.flatMap((result) =>
      result.status === "ok" ? [[result.data.itemCode, result.data]] : []
    )
  );
  const nasdaq = marketMap.get("NASDAQ")?.changePercent;
  const sp500 = marketMap.get("SP500")?.changePercent;
  const vix = marketMap.get("VIX")?.changePercent;

  if (nasdaq === undefined && sp500 === undefined && vix === undefined) {
    return undefined;
  }

  if ((nasdaq ?? 0) <= -1.5 && (sp500 ?? 0) <= -1 && (vix ?? 0) >= 5) {
    return "위험 선호는 약해졌고 단기 강도도 보수적으로 해석하는 편이 적절합니다.";
  }

  if ((nasdaq ?? 0) >= 1 && (sp500 ?? 0) >= 0.8 && (vix ?? 0) <= -5) {
    return "심리와 강도는 완전히 꺾이지 않았지만 추격보다 선별 대응이 더 자연스럽습니다.";
  }

  return "표면 심리는 버티지만 강도 해석은 중립에 가깝습니다.";
}

function formatCompanyList(values: string[], fallback: string): string {
  return values.length > 0 ? values.join(", ") : fallback;
}

function formatCount(value?: number | null, fallback = "확인 필요"): string {
  return value === null || value === undefined ? fallback : `${value}개`;
}

function stripArrow(value: string): string {
  return value.replace(/^→\s*/, "").trim();
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2
  }).format(value);
}

function formatValueTransition(previousValue: number | undefined, value: number): string {
  if (previousValue === undefined) {
    return formatValue(value);
  }

  return `${formatValue(previousValue)} → ${formatValue(value)}`;
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
