import {
  formatBriefingSessionLabel,
  formatBriefingSessionRole,
  formatBriefingSessionSlug,
  type BriefingSession
} from "./briefing-session.js";
import type { MarketDataFetchResult } from "./market-data.js";
import { buildIndicatorTags } from "./personal-rebalancing-snapshot.js";

export type PublicDailyBriefing = {
  archivePath: string;
  briefingSession: BriefingSession;
  canonicalPath: string;
  closingParagraph: string;
  disclaimer: string;
  eventBullets: string[];
  excludedTelegramOnlySections: string[];
  headlineEvents: Array<{
    headline: string;
    sourceLabel: string;
    summary: string;
  }>;
  indicatorTags: string[];
  globalSnapshot: {
    majorIndices: string;
    ratesFxCommodities: string;
    riskAppetite: string;
  };
  keyIndicatorBullets: string[];
  marketInterpretation: {
    fundFlow: string;
    macro: string;
    styleTheme: string;
  };
  marketSummary: {
    purpose: string;
    interpretation: string;
    overall: string;
    sentimentStrength: string;
    structureRisk: string;
    valuationFundamentals: string;
  };
  marketSnapshot: Array<{
    asOfDate: string;
    changePercent?: number;
    itemCode: string;
    itemName: string;
    previousValue?: number;
    value: number;
  }>;
  riskBullets: string[];
  runDate: string;
  scheduleBullets: string[];
  sessionLabel: string;
  sessionRole: string;
  newsReferences: Array<{
    sourceLabel: string;
    title: string;
    url: string;
  }>;
  sectorSummary: {
    strong: string;
    weak: string;
  };
  summaryLine: string;
  title: string;
  trendNewsBullets: string[];
};

const EXCLUDED_TELEGRAM_ONLY_SECTIONS = [
  "holdings",
  "holdingTrendBullets",
  "articleSummaryBullets",
  "portfolioNewsBriefs",
  "personalizedQuantScorecards",
  "portfolioRebalancing"
] as const;

export function buildPublicDailyBriefing(input: {
  briefingSession?: BriefingSession;
  eventBullets?: string[];
  headlineEvents?: Array<{
    headline: string;
    sourceLabel: string;
    summary: string;
  }>;
  fundFlowBullets?: string[];
  keyIndicatorBullets?: string[];
  macroBullets?: string[];
  marketBullets?: string[];
  marketResults: MarketDataFetchResult[];
  newsReferences?: Array<{
    sourceLabel: string;
    title: string;
    url: string;
  }>;
  riskBullets?: string[];
  runDate: string;
  summaryLine: string;
  trendNewsBullets?: string[];
}): PublicDailyBriefing {
  const briefingSession = input.briefingSession ?? "pre_market";
  const marketSnapshot = input.marketResults
    .filter(
      (result): result is Extract<MarketDataFetchResult, { status: "ok" }> =>
        result.status === "ok"
    )
    .map((result) => ({
      itemCode: result.data.itemCode,
      itemName: result.data.itemName,
      asOfDate: result.data.asOfDate,
      value: result.data.value,
      ...(result.data.previousValue === undefined
        ? {}
        : { previousValue: result.data.previousValue }),
      ...(result.data.changePercent === undefined
        ? {}
        : { changePercent: result.data.changePercent })
    }));
  const marketMap = new Map(marketSnapshot.map((item) => [item.itemCode, item]));
  const marketBullets = input.marketBullets ?? [];
  const macroBullets = input.macroBullets ?? [];
  const fundFlowBullets = input.fundFlowBullets ?? [];
  const eventBullets = input.eventBullets ?? [];
  const riskBullets = input.riskBullets ?? [];
  const keyIndicatorBullets = input.keyIndicatorBullets ?? [];
  const newsReferences = input.newsReferences ?? [];
  const headlineEvents = (input.headlineEvents ?? []).map((event) => ({
    ...event,
    summary: sanitizeHeadlineEventSummary(event.summary)
  }));
  const trendNewsBullets = input.trendNewsBullets ?? [];
  const hasExplicitPurposeBullet = isExplicitPurposeBullet(marketBullets[0]);
  const narrativeMarketBullets = hasExplicitPurposeBullet
    ? marketBullets.slice(1)
    : marketBullets;
  const scheduleBullets =
    eventBullets.length > 0
      ? eventBullets
      : buildDefaultCheckpointBullets(briefingSession);

  return {
    title: buildPublicBriefingTitle(briefingSession, input.runDate),
    briefingSession,
    runDate: input.runDate,
    sessionLabel: formatBriefingSessionLabel(briefingSession),
    sessionRole: formatBriefingSessionRole(briefingSession),
    indicatorTags: buildIndicatorTags(input.marketResults),
    summaryLine: input.summaryLine,
    marketSnapshot,
    marketSummary: {
      purpose: buildBriefingPurposeLine(briefingSession),
      overall:
        narrativeMarketBullets[0] ??
        "현재 확보된 시장 데이터 기준으로 핵심 흐름을 우선 정리했습니다.",
      sentimentStrength: buildRiskAppetiteLine(marketMap),
      valuationFundamentals:
        narrativeMarketBullets[1] ??
        "밸류와 펀더멘털 세부 데이터는 일부 보강 중입니다.",
      structureRisk:
        riskBullets[0] ?? "구조 리스크는 추가 확인이 필요한 구간입니다.",
      interpretation:
        narrativeMarketBullets[2] ??
        "표면 흐름만 보기보다 내부 체력과 리스크 신호를 함께 읽는 편이 적절합니다."
    },
    globalSnapshot: {
      majorIndices: buildMajorIndicesLine(marketMap),
      ratesFxCommodities: buildRatesFxCommoditiesLine(marketMap),
      riskAppetite: buildRiskAppetiteLine(marketMap)
    },
    keyIndicatorBullets,
    sectorSummary: {
      strong:
        fundFlowBullets[0] ??
        "현재 확보된 데이터 기준으로는 강한 섹터를 단정하기보다 차별화 흐름을 점검하는 편이 적절합니다.",
      weak:
        riskBullets[1] ??
        "일부 섹터 데이터는 보강 중이므로 약한 섹터 판단은 추가 확인이 필요합니다."
    },
    marketInterpretation: {
      macro:
        macroBullets[0] ??
        "거시 변수는 금리, 환율, 원자재 흐름 중심으로 해석하는 편이 적절합니다.",
      fundFlow:
        fundFlowBullets[0] ??
        "자금 흐름과 breadth는 추가 데이터 확인 전까지 보수적으로 읽는 편이 좋습니다.",
      styleTheme:
        marketBullets[3] ??
        eventBullets[0] ??
        "스타일과 테마 해석은 일부 이벤트 데이터 보강이 더 필요합니다."
    },
    eventBullets,
    headlineEvents,
    scheduleBullets,
    riskBullets:
      riskBullets.length > 0
        ? riskBullets
        : ["현재 확보된 시장 데이터 기준으로 변동성 재확인 구간입니다."],
    canonicalPath: buildPublicBriefingCanonicalPath(input.runDate, briefingSession),
    archivePath: buildPublicBriefingArchivePath(input.runDate, briefingSession),
    excludedTelegramOnlySections: [...EXCLUDED_TELEGRAM_ONLY_SECTIONS],
    newsReferences,
    closingParagraph:
      briefingSession === "pre_market"
        ? "오늘 시장은 방향성 자체보다 어떤 프레임으로 읽을지와 어디서 해석이 틀어질 수 있는지를 먼저 점검하는 편이 중요합니다."
        : briefingSession === "weekend_briefing"
          ? "주말 브리핑은 지난 한 주의 큰 흐름과 다음 주 초 체크포인트를 함께 묶어 읽는 편이 중요합니다."
        : "오늘 해석은 결과 확인으로 끝나지 않고, 어떤 기준을 다음 세션에 보정해야 하는지까지 이어져야 합니다.",
    disclaimer:
      briefingSession === "pre_market"
        ? "이 페이지는 공개 프리마켓 브리핑이며, 개인화 포트폴리오 리밸런싱 제안은 포함하지 않습니다."
        : briefingSession === "weekend_briefing"
          ? "이 페이지는 공개 주말 브리핑이며, 개인화 포트폴리오 리밸런싱 제안은 포함하지 않습니다."
        : "이 페이지는 공개 포스트마켓 브리핑이며, 개인화 포트폴리오 리밸런싱 제안은 포함하지 않습니다.",
    trendNewsBullets
  };
}

function sanitizeHeadlineEventSummary(summary: string) {
  return summary
    .replace(/^\*\*?\s*브리핑용 요약 제안\s*\**\s*[:：-]?\s*/i, "")
    .replace(/^브리핑용 요약 제안\s*[:：-]?\s*/i, "")
    .trim();
}

export function buildPublicBriefingCanonicalPath(
  runDate: string,
  briefingSession: BriefingSession
): string {
  return `/briefings/${runDate}/${formatBriefingSessionSlug(briefingSession)}/`;
}

export function buildPublicBriefingUrl(
  baseUrl: string,
  runDate: string,
  briefingSession: BriefingSession
): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return `${normalizedBaseUrl}${buildPublicBriefingCanonicalPath(runDate, briefingSession)}`;
}

export function buildPublicReportDetailPath(reportId: string): string {
  return `/reports/${reportId}`;
}

export function buildPublicReportDetailUrl(
  baseUrl: string,
  reportId: string
): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return `${normalizedBaseUrl}${buildPublicReportDetailPath(reportId)}`;
}

export function buildPublicBriefingArchivePath(
  runDate: string,
  briefingSession: BriefingSession
): string {
  const [year, month, day] = runDate.split("-");

  if (!year || !month || !day) {
    throw new Error(`Invalid runDate: ${runDate}`);
  }

  return `/briefings/${year}/${month}/${day}/${formatBriefingSessionSlug(briefingSession)}/`;
}

function buildMajorIndicesLine(
  marketMap: Map<string, PublicDailyBriefing["marketSnapshot"][number]>
): string {
  const values = [
    marketMap.get("NASDAQ"),
    marketMap.get("SP500"),
    marketMap.get("DOW"),
    marketMap.get("KOSPI"),
    marketMap.get("KOSDAQ")
  ]
    .filter((item): item is PublicDailyBriefing["marketSnapshot"][number] => item !== undefined)
    .slice(0, 4)
    .map((item) => `${item.itemName} ${formatChange(item.changePercent)}`);

  return values.length > 0
    ? values.join(" · ")
    : "주요 지수 데이터는 추가 확인이 필요합니다.";
}

function buildRatesFxCommoditiesLine(
  marketMap: Map<string, PublicDailyBriefing["marketSnapshot"][number]>
): string {
  const values = [
    marketMap.get("US10Y"),
    marketMap.get("USD_KRW"),
    marketMap.get("DXY"),
    marketMap.get("WTI"),
    marketMap.get("COPPER")
  ]
    .filter((item): item is PublicDailyBriefing["marketSnapshot"][number] => item !== undefined)
    .slice(0, 4)
    .map((item) => `${item.itemName} ${formatChange(item.changePercent)}`);

  return values.length > 0
    ? values.join(" · ")
    : "금리·환율·원자재 데이터는 일부 보강 중입니다.";
}

function buildRiskAppetiteLine(
  marketMap: Map<string, PublicDailyBriefing["marketSnapshot"][number]>
): string {
  const vix = marketMap.get("VIX")?.changePercent;
  const nasdaq = marketMap.get("NASDAQ")?.changePercent;
  const sp500 = marketMap.get("SP500")?.changePercent;

  if ((vix ?? 0) >= 5) {
    return "변동성 경계가 높아져 위험 선호는 보수적으로 읽는 편이 적절합니다.";
  }

  if ((nasdaq ?? 0) >= 1 && (sp500 ?? 0) >= 0.8) {
    return "표면적인 위험 선호는 유지되지만 추격 해석은 신중할 필요가 있습니다.";
  }

  return "위험 선호 심리는 중립에 가깝고 추가 확인이 필요한 구간입니다.";
}

function formatChange(value?: number): string {
  if (value === undefined) {
    return "변화 확인 필요";
  }

  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }

  if (value < 0) {
    return `${value.toFixed(2)}%`;
  }

  return "보합";
}

function buildPublicBriefingTitle(
  session: BriefingSession,
  runDate: string
): string {
  if (session === "weekend_briefing") {
    return `🗞️ 주말 시장 브리핑 (${runDate})`;
  }

  return `🗞️ ${formatBriefingSessionLabel(session)} 시장 브리핑 (${runDate})`;
}

function isExplicitPurposeBullet(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return (
    value.startsWith("이번 ") &&
    value.includes("브리핑") &&
    value.includes("목적")
  );
}

function buildBriefingPurposeLine(session: BriefingSession): string {
  if (session === "pre_market") {
    return "이번 오전 브리핑은 미국장 마감 결과를 바탕으로 오늘 국내장 시초가와 장 초반 수급 방향을 가늠하는 데 목적이 있습니다.";
  }

  if (session === "post_market") {
    return "이번 저녁 브리핑은 오늘 국내장과 대체거래소 흐름을 정리하고, 그 결과를 바탕으로 오늘 밤 미국장 방향을 예보하는 데 목적이 있습니다.";
  }

  return "이번 주말 브리핑은 가장 최근 미장 마감 흐름을 바탕으로 한 주 동안 시장을 움직인 핵심 이슈를 정리하고, 다음 주 주목해야 할 일정과 준비 포인트를 요약하는 데 목적이 있습니다.";
}

function buildDefaultCheckpointBullets(session: BriefingSession): string[] {
  if (session === "pre_market") {
    return [
      "시초가 급락이 과민 반응인지 실제 수급 이탈인지 장 시작 30분 안에 구분해서 보셔야 합니다.",
      "환율과 외국인 선물 흐름이 같은 방향으로 이어지는지 먼저 확인하는 편이 좋습니다."
    ];
  }

  if (session === "post_market") {
    return [
      "미국 선물 반등이 현물 개장까지 유지되는지 먼저 보셔야 합니다.",
      "국내장에서 강했던 테마가 미국 동종 업종에서도 이어지는지 확인이 필요합니다."
    ];
  }

  return [
    "다음 주 핵심 경제지표와 주요 실적 일정을 먼저 정리해 두는 편이 좋습니다.",
    "반복적으로 언급된 거시 이슈가 다음 주 초에도 이어지는지 우선 확인하셔야 합니다."
  ];
}
