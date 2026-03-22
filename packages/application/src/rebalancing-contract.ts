export type ProfileType = "aggressive" | "balanced" | "conservative";

export type PortfolioSummarySnapshot = {
  eventRiskCount?: number | null;
  holdingCount?: number | null;
  holdCount?: number | null;
  increaseCount?: number | null;
  reduceCount?: number | null;
  watchCount?: number | null;
};

export type RebalancingSummarySnapshot = {
  holdCandidates?: string[];
  increaseCandidates?: string[];
  reduceCandidates?: string[];
  watchCandidates?: string[];
};

export type HoldingHardRuleSnapshot = {
  code?: string;
  effect?: string;
  reason?: string;
};

export type HoldingRebalancingSnapshot = {
  constraints?: string[];
  finalAction?: string;
  finalProfileScore?: number | null;
  futureExpectationScore?: number | null;
  guide?: string;
  hardRules?: HoldingHardRuleSnapshot[];
  intrinsicValueScore?: number | null;
  name: string;
  oneLineJudgment?: string;
  portfolioFitScore?: number | null;
  priceTrendScore?: number | null;
};

export type MarketOverlaySnapshot = {
  blackSwanLabel?: string;
  buffettByMarketLabel?: string;
  finalMarketRegimeScoreAggressive?: number | null;
  finalMarketRegimeScoreBalanced?: number | null;
  finalMarketRegimeScoreConservative?: number | null;
  market?: string;
  marketCompositeLabel?: string;
  marketFundamentalLabel?: string;
  marketStrengthLabel?: string;
  sentimentLabel?: string;
};

export type ReferenceMarketBriefSnapshot = {
  eventSummary?: string;
  flowSummary?: string;
  macroSummary?: string;
};

export type PersonalizedPortfolioRebalancingData = {
  holdings?: HoldingRebalancingSnapshot[];
  marketOverlay?: MarketOverlaySnapshot;
  portfolioSummary?: PortfolioSummarySnapshot;
  rebalancingSummary?: RebalancingSummarySnapshot;
  referenceMarketBrief?: ReferenceMarketBriefSnapshot;
  riskBullets?: string[];
  selectedProfile?: ProfileType;
};

export function formatStockViewLabel(score?: number | null): string {
  if (score === null || score === undefined) {
    return "확인 필요";
  }

  if (score >= 80) {
    return "매우 양호";
  }

  if (score >= 65) {
    return "양호";
  }

  if (score >= 50) {
    return "중립";
  }

  if (score >= 35) {
    return "부담";
  }

  return "취약";
}

export function formatPortfolioFitLabel(score?: number | null): string {
  if (score === null || score === undefined) {
    return "확인 필요";
  }

  if (score >= 80) {
    return "높음";
  }

  if (score >= 65) {
    return "보통";
  }

  if (score >= 50) {
    return "점검 필요";
  }

  return "낮음";
}

export function formatMarketRegimeLabel(score?: number | null): string {
  if (score === null || score === undefined) {
    return "점검 필요";
  }

  if (score >= 80) {
    return "우호적";
  }

  if (score >= 65) {
    return "비교적 우호적";
  }

  if (score >= 50) {
    return "중립";
  }

  if (score >= 35) {
    return "방어적";
  }

  return "매우 방어적";
}

export function formatStructureRiskLabel(score?: number | null): string {
  if (score === null || score === undefined) {
    return "구조 리스크 점검 필요";
  }

  if (score >= 80) {
    return "구조 리스크 매우 높음";
  }

  if (score >= 65) {
    return "구조 리스크 높음";
  }

  if (score >= 50) {
    return "구조 리스크 보통";
  }

  if (score >= 35) {
    return "구조 리스크 낮음";
  }

  return "구조 리스크 매우 낮음";
}
