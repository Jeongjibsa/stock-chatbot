import type { LlmClient } from "./llm-client.js";
import type { BriefingSession } from "./briefing-session.js";
import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief, MacroTrendBrief } from "./news.js";
import type { QuantScorecard } from "./quant-scorecard.js";
import type { PersonalizedPortfolioRebalancingData } from "./rebalancing-contract.js";
import {
  buildDailyReportPromptContract,
  parseDailyReportStructuredOutput,
  type DailyReportPromptAudience
} from "./report-prompt-contract.js";

export type DailyReportComposition = {
  articleSummaryBullets: string[];
  eventBullets: string[];
  fundFlowBullets: string[];
  headlineEvents: Array<{ headline: string; sourceLabel: string; summary: string }>;
  holdingTrendBullets: string[];
  keyIndicatorBullets: string[];
  macroBullets: string[];
  marketBullets: string[];
  llmResponseId?: string;
  newsReferences: Array<{ sourceLabel: string; title: string; url: string }>;
  oneLineSummary: string;
  riskBullets: string[];
  strategyBullets: string[];
  trendNewsBullets: string[];
};

export class DailyReportCompositionService {
  constructor(
    private readonly dependencies: {
      llmClient: LlmClient;
    }
  ) {}

  async compose(input: {
    audience?: DailyReportPromptAudience;
    briefingSession?: BriefingSession;
    holdings: Array<{
      companyName: string;
      exchange: string;
      symbol: string;
    }>;
    marketResults: MarketDataFetchResult[];
    macroTrendBriefs?: MacroTrendBrief[];
    newsBriefs: HoldingNewsBrief[];
    quantScorecards: QuantScorecard[];
    quantScenarios: string[];
    riskCheckpoints: string[];
    runDate: string;
    timeoutMs?: number;
    sessionComparison?: {
      priorPublicSignals?: string[];
      priorPublicSummary?: string | null;
      priorStrategyActions?: string[];
      priorStrategyStance?: string | null;
    };
    portfolioRebalancing?: PersonalizedPortfolioRebalancingData;
    cachedContent?: string;
  }): Promise<DailyReportComposition> {
    const promptInput: Parameters<typeof buildDailyReportPromptContract>[0] = {
      ...(input.audience ? { audience: input.audience } : {}),
      ...(input.briefingSession ? { briefingSession: input.briefingSession } : {}),
      holdings: input.holdings,
      marketResults: input.marketResults,
      macroTrendBriefs: input.macroTrendBriefs ?? [],
      newsBriefs: input.newsBriefs,
      quantScorecards: input.quantScorecards,
      quantScenarios: input.quantScenarios,
      riskCheckpoints: input.riskCheckpoints,
      runDate: input.runDate,
      ...(input.sessionComparison
        ? { sessionComparison: input.sessionComparison }
        : {})
    };

    if (input.portfolioRebalancing) {
      promptInput.portfolioRebalancing = input.portfolioRebalancing;
    }

    const prompt = buildDailyReportPromptContract(promptInput);
    const llmResponse = await this.dependencies.llmClient.generate({
      task: "market-report-composition",
      input: prompt.input,
      instructions: prompt.instructions,
      metadata: prompt.metadata,
      schema: prompt.schema,
      ...(input.cachedContent ? { cachedContent: input.cachedContent } : {}),
      ...(input.timeoutMs ? { timeoutMs: input.timeoutMs } : {})
    });
    const parsed = parseDailyReportStructuredOutput(llmResponse.outputText);
    const keyIndicatorBullets =
      input.audience === "public_web"
        ? repairPublicKeyIndicatorBullets(parsed, input.briefingSession)
        : parsed.keyIndicatorBullets;
    const result: DailyReportComposition = {
      oneLineSummary: parsed.oneLineSummary,
      marketBullets: parsed.marketBullets,
      macroBullets: parsed.macroBullets,
      fundFlowBullets: parsed.fundFlowBullets,
      eventBullets: parsed.eventBullets,
      holdingTrendBullets: parsed.holdingTrendBullets,
      articleSummaryBullets: parsed.articleSummaryBullets,
      keyIndicatorBullets,
      headlineEvents: parsed.headlineEvents,
      strategyBullets: parsed.strategyBullets,
      riskBullets: parsed.riskBullets,
      trendNewsBullets: parsed.trendNewsBullets,
      newsReferences: parsed.newsReferences
    };

    if (llmResponse.id) {
      result.llmResponseId = llmResponse.id;
    }

    return result;
  }
}

export function repairPublicKeyIndicatorBullets(
  parsed: ReturnType<typeof parseDailyReportStructuredOutput>,
  briefingSession: BriefingSession | undefined
) {
  const minimumCount = briefingSession === "weekend_briefing" ? 3 : 2;
  const direct = dedupeSignalBullets(parsed.keyIndicatorBullets);

  if (direct.length >= minimumCount) {
    return direct.slice(0, 4);
  }

  const supplemental = dedupeSignalBullets([
    ...direct,
    ...parsed.marketBullets.filter((bullet, index) => {
      if (index > 0) {
        return true;
      }

      return !looksLikePurposeBullet(bullet);
    }),
    ...parsed.macroBullets,
    ...parsed.riskBullets,
    ...parsed.eventBullets,
    ...parsed.trendNewsBullets,
    parsed.oneLineSummary
  ]);

  return supplemental.slice(0, Math.max(minimumCount, Math.min(4, supplemental.length)));
}

export function repairPublicHeadlineEvents(input: {
  briefingSession: BriefingSession | undefined;
  headlineEvents: Array<{
    headline: string;
    sourceLabel: string;
    summary: string;
  }>;
  macroTrendBriefs: MacroTrendBrief[];
}) {
  const repaired: Array<{
    headline: string;
    sourceLabel: string;
    summary: string;
  }> = [];
  const seenHeadlines = new Set<string>();
  const referenceMatches = input.macroTrendBriefs.flatMap((brief) =>
    brief.references.map((reference) => ({
      brief,
      normalizedTitle: normalizeEventTitle(reference.title),
      reference
    }))
  );

  for (const event of input.headlineEvents) {
    const headline = event.headline.trim();

    if (!headline) {
      continue;
    }

    const normalizedHeadline = normalizeEventTitle(headline);

    if (!normalizedHeadline || seenHeadlines.has(normalizedHeadline)) {
      continue;
    }

    const matchedReference =
      referenceMatches.find(
        (candidate) => candidate.normalizedTitle === normalizedHeadline
      ) ??
      referenceMatches.find(
        (candidate) =>
          candidate.normalizedTitle.includes(normalizedHeadline) ||
          normalizedHeadline.includes(candidate.normalizedTitle)
      );
    const sourceLabel =
      event.sourceLabel.trim() ||
      matchedReference?.reference.sourceLabel ||
      "뉴스";

    repaired.push({
      headline,
      sourceLabel,
      summary: buildPublicHeadlineEventSummary({
        briefingSession: input.briefingSession,
        headline,
        rawSummary: event.summary,
        ...(matchedReference?.brief.theme
          ? { theme: matchedReference.brief.theme }
          : {})
      })
    });
    seenHeadlines.add(normalizedHeadline);
  }

  return repaired.slice(0, 4);
}

export function repairPublicSummaryLine(input: {
  briefingSession: BriefingSession | undefined;
  currentSummary: string;
  keyIndicatorBullets: string[];
  macroTrendBriefs: MacroTrendBrief[];
  priorSignals?: string[];
  priorSummary?: string | null;
}) {
  const summary = input.currentSummary.trim();

  if (
    summary &&
    summary !== input.priorSummary?.trim() &&
    !looksLikeGenericPublicSummary(summary)
  ) {
    return summary;
  }

  const priorSignalSet = new Set(
    (input.priorSignals ?? []).map((signal) => normalizeEventTitle(signal))
  );
  const orderedSignals = [
    ...input.keyIndicatorBullets.filter(
      (bullet) =>
        !looksLikeSessionSignal(bullet) &&
        !priorSignalSet.has(normalizeEventTitle(bullet))
    ),
    ...input.keyIndicatorBullets.filter((bullet) => !looksLikeSessionSignal(bullet)),
    ...input.keyIndicatorBullets
  ];
  const uniqueSignals = dedupeSignalBullets(orderedSignals);
  const primarySignal = uniqueSignals[0];
  const themeClause = buildThemeBridgeClause(input.macroTrendBriefs[0]?.theme);
  const sessionClause = buildSessionBridgeClause(input.briefingSession);

  return [primarySignal, themeClause, sessionClause]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();
}

export function diversifyPublicKeyIndicatorBullets(input: {
  briefingSession: BriefingSession | undefined;
  macroTrendBriefs: MacroTrendBrief[];
  priorSignals?: string[];
  signals: string[];
}) {
  const dedupedSignals = dedupeSignalBullets(input.signals);
  const priorSignalSet = new Set(
    (input.priorSignals ?? []).map((signal) => normalizeEventTitle(signal))
  );
  const overlapIndexes = dedupedSignals
    .map((signal, index) =>
      priorSignalSet.has(normalizeEventTitle(signal)) ? index : -1
    )
    .filter((index) => index >= 0);

  if (overlapIndexes.length < 2) {
    return dedupedSignals.slice(0, 4);
  }

  const replacements = buildMacroTrendSignalCandidates({
    briefingSession: input.briefingSession,
    macroTrendBriefs: input.macroTrendBriefs,
    signals: dedupedSignals
  });
  const next = [...dedupedSignals];

  for (const replacement of replacements) {
    const repeatedIndex = overlapIndexes.pop();

    if (repeatedIndex === undefined) {
      break;
    }

    next[repeatedIndex] = replacement;
  }

  return dedupeSignalBullets(next).slice(0, 4);
}

function dedupeSignalBullets(lines: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const normalized = line.trim();

    if (!normalized || isGenericSignalPlaceholder(normalized)) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function looksLikePurposeBullet(line: string) {
  return (
    line.includes("브리핑") &&
    (line.includes("목적") || line.includes("집중") || line.includes("가늠"))
  );
}

function isGenericSignalPlaceholder(line: string) {
  return (
    line === "추가 확인이 필요한 구간입니다." ||
    line.includes("추가 확인이 필요한 구간") ||
    line.includes("방향성 확인이 더 필요") ||
    line.includes("일부 데이터는 보강 중")
  );
}

function buildPublicHeadlineEventSummary(input: {
  briefingSession: BriefingSession | undefined;
  headline: string;
  rawSummary: string;
  theme?: MacroTrendBrief["theme"];
}) {
  const text = `${input.headline} ${input.rawSummary}`.toLowerCase();

  if (hasAnyKeyword(text, ["futures", "선물"])) {
    return input.briefingSession === "post_market"
      ? "선물과 장외 흐름이 오늘 밤 미장 방향성을 얼마나 이어갈지 함께 보셔야 합니다."
      : "선물과 장외 흐름이 다음 세션 시초가 기대를 얼마나 흔드는지 함께 보셔야 합니다.";
  }

  if (
    hasAnyKeyword(text, [
      "fed",
      "fomc",
      "powell",
      "rate",
      "rates",
      "yield",
      "yields",
      "금리",
      "연준",
      "국채"
    ])
  ) {
    return "금리와 중앙은행 발언 이슈가 시장 밸류에이션과 위험 선호에 어떤 압력을 주는지 함께 보셔야 합니다.";
  }

  if (
    hasAnyKeyword(text, [
      "dollar",
      "usd",
      "fx",
      "won",
      "yen",
      "환율",
      "달러"
    ])
  ) {
    return "달러와 환율 흐름이 외국인 수급과 성장주 밸류 부담에 어떤 영향을 주는지 함께 보셔야 합니다.";
  }

  if (
    hasAnyKeyword(text, [
      "tariff",
      "trade",
      "war",
      "geopolitical",
      "supply chain",
      "관세",
      "무역",
      "전쟁",
      "지정학",
      "공급망"
    ])
  ) {
    return "관세와 지정학 변수는 경기민감주와 수출주 심리를 동시에 흔들 수 있어 방어적 해석이 필요합니다.";
  }

  if (
    hasAnyKeyword(text, [
      "earnings",
      "guidance",
      "stock",
      "shares",
      "turnaround",
      "semiconductor",
      "chip",
      "ai",
      "반도체",
      "실적",
      "가이던스"
    ])
  ) {
    return "개별 대형주와 업종 뉴스가 지수 기여도와 섹터 심리를 얼마나 흔드는지 함께 보셔야 합니다.";
  }

  switch (input.theme) {
    case "fed_policy":
      return "금리와 중앙은행 관련 뉴스가 정책 기대와 긴축 부담을 다시 자극하는지 함께 보셔야 합니다.";
    case "fx_rates":
      return "달러와 채권금리 뉴스가 환율 부담과 밸류에이션 해석에 어떤 영향을 주는지 함께 보셔야 합니다.";
    case "global_risk":
      return "지정학과 공급망 뉴스가 시장 전반의 위험 회피 심리를 자극하는지 함께 보셔야 합니다.";
    case "night_futures":
      return "야간 선물 흐름이 다음 세션 초반 방향성에 어떤 힌트를 주는지 함께 보셔야 합니다.";
    case "sector_rotation":
      return "업종별 뉴스가 강한 섹터와 약한 섹터 구분을 얼마나 뚜렷하게 만드는지 함께 보셔야 합니다.";
    case "macro_policy":
      return "정책과 정부 발언 뉴스가 시장 기대를 얼마나 다시 조정하는지 함께 보셔야 합니다.";
    default:
      return "이 뉴스가 시장 심리와 주요 자산 가격 해석에 어떤 파급을 주는지 함께 보셔야 합니다.";
  }
}

function buildMacroTrendSignalCandidates(input: {
  briefingSession: BriefingSession | undefined;
  macroTrendBriefs: MacroTrendBrief[];
  signals: string[];
}) {
  const existing = new Set(
    input.signals.map((signal) => normalizeEventTitle(signal))
  );
  const candidates: string[] = [];

  for (const brief of input.macroTrendBriefs) {
    const candidate = buildThemeSignal(brief.theme, input.briefingSession);

    if (candidate) {
      candidates.push(candidate);
    }
  }

  const sessionCandidate = buildSessionDiversificationSignal(
    input.briefingSession
  );

  if (sessionCandidate) {
    candidates.push(sessionCandidate);
  }

  return dedupeSignalBullets(
    candidates.filter((candidate) => !existing.has(normalizeEventTitle(candidate)))
  );
}

function buildSessionDiversificationSignal(
  briefingSession: BriefingSession | undefined
) {
  if (briefingSession === "pre_market") {
    return "개장 전에는 환율과 선물 반응이 같은 방향으로 움직이는지 먼저 보셔야 합니다.";
  }

  if (briefingSession === "post_market") {
    return "장 마감 후에는 국내장 결과가 야간 선물 톤으로 이어지는지 먼저 보셔야 합니다.";
  }

  if (briefingSession === "weekend_briefing") {
    return "주말에는 다음 주 첫 세션과 캘린더 리스크를 함께 보셔야 합니다.";
  }

  return undefined;
}

function buildThemeSignal(
  theme: MacroTrendBrief["theme"] | undefined,
  briefingSession: BriefingSession | undefined
) {
  switch (theme) {
    case "fed_policy":
      return "연준과 금리 이슈가 다시 부각돼 성장주 밸류 부담을 함께 보셔야 합니다.";
    case "fx_rates":
      return "달러와 채권금리 뉴스가 환율 부담과 외국인 수급 해석에 직접 연결되고 있습니다.";
    case "global_risk":
      return "관세와 지정학 뉴스가 반복돼 경기민감주 심리보다 방어 업종 반응을 먼저 보셔야 합니다.";
    case "night_futures":
      return briefingSession === "post_market"
        ? "야간 선물 흐름이 오늘 밤 미장 방향성 힌트로 연결되는지 보셔야 합니다."
        : "야간 선물 흐름이 다음 세션 시초가 톤으로 이어지는지 보셔야 합니다.";
    case "sector_rotation":
      return "업종 로테이션 뉴스가 강한 섹터와 약한 섹터 구분을 더 뚜렷하게 만들고 있습니다.";
    case "macro_policy":
      return "정책과 정부 발언 뉴스가 시장 기대를 다시 조정하는지 함께 보셔야 합니다.";
    case "market_theme":
      return "시장 전반 테마 뉴스가 위험 선호보다 지수 체력 점검을 더 요구하고 있습니다.";
    default:
      return undefined;
  }
}

function looksLikeGenericPublicSummary(line: string) {
  return (
    line ===
      "최근 가용 시장 지표 기준으로 핵심 대응 포인트를 정리했습니다." ||
    line ===
      "달러 강세와 환율 부담이 이어지고 있어, 비중 확대보다 관망과 리스크 관리에 집중하시는 편이 좋습니다." ||
    line ===
      "미국 증시 급락과 변동성 확대가 겹쳐 있어, 신규 매수보다 방어적 대응을 우선하시는 편이 좋습니다." ||
    line ===
      "위험 선호가 완화되고 있어, 추격 매수보다 선별적 분할 접근으로 대응하시는 편이 좋습니다."
  );
}

function looksLikeSessionSignal(line: string) {
  return (
    line.includes("장 시작 전에는") ||
    line.includes("장 마감 후에는") ||
    line.includes("주말 브리핑에서는")
  );
}

function buildThemeBridgeClause(theme: MacroTrendBrief["theme"] | undefined) {
  switch (theme) {
    case "fed_policy":
      return "금리와 중앙은행 이슈가 시장 해석의 중심에 있습니다.";
    case "fx_rates":
      return "환율과 채권금리 뉴스가 자산 가격 해석의 중심에 있습니다.";
    case "global_risk":
      return "지정학과 관세 뉴스가 위험 회피 심리를 자극하고 있습니다.";
    case "night_futures":
      return "야간 선물 흐름이 다음 세션 기대를 흔들고 있습니다.";
    case "sector_rotation":
      return "업종 로테이션 뉴스가 섹터별 차별화를 키우고 있습니다.";
    case "macro_policy":
      return "정책 발언이 시장 기대를 다시 조정하고 있습니다.";
    default:
      return undefined;
  }
}

function buildSessionBridgeClause(briefingSession: BriefingSession | undefined) {
  if (briefingSession === "pre_market") {
    return "국장 시초가와 초반 수급 반응을 함께 확인하셔야 합니다.";
  }

  if (briefingSession === "post_market") {
    return "야간 선물과 오늘 밤 미장 방향성을 함께 확인하셔야 합니다.";
  }

  if (briefingSession === "weekend_briefing") {
    return "다음 주 첫 세션과 주간 일정 변수까지 같이 보셔야 합니다.";
  }

  return undefined;
}

function normalizeEventTitle(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
