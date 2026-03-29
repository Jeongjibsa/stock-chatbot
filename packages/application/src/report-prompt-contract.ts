import type { BriefingSession } from "./briefing-session.js";
import type { HoldingNewsBrief, MacroTrendBrief } from "./news.js";
import type { MarketDataFetchResult } from "./market-data.js";
import type { QuantScorecard } from "./quant-scorecard.js";
import type { PersonalizedPortfolioRebalancingData } from "./rebalancing-contract.js";

export type DailyReportPromptAudience =
  | "telegram_personalized"
  | "public_web";

export type DailyReportPromptInput = {
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
  sessionComparison?: {
    priorPublicSignals?: string[];
    priorPublicSummary?: string | null;
    priorStrategyActions?: string[];
    priorStrategyStance?: string | null;
  };
  portfolioRebalancing?: PersonalizedPortfolioRebalancingData;
};

export type DailyReportStructuredOutput = {
  articleSummaryBullets: string[];
  eventBullets: string[];
  fundFlowBullets: string[];
  headlineEvents: Array<{
    headline: string;
    sourceLabel: string;
    summary: string;
  }>;
  holdingTrendBullets: string[];
  macroBullets: string[];
  marketBullets: string[];
  newsReferences: Array<{ sourceLabel: string; title: string; url: string }>;
  oneLineSummary: string;
  riskBullets: string[];
  strategyBullets: string[];
  trendNewsBullets: string[];
};

export function buildDailyReportPromptContract(
  input: DailyReportPromptInput
): {
  input: string;
  instructions: string;
  metadata: Record<string, string>;
  schema: Record<string, unknown>;
} {
  const audience = input.audience ?? "telegram_personalized";
  const briefingSession = input.briefingSession ?? "pre_market";

  return {
    instructions: buildPromptInstructions(audience, briefingSession),
    input: JSON.stringify(
      buildPromptPayload({
        ...input,
        audience,
        briefingSession
      })
    ),
    metadata: {
      promptAudience: audience,
      promptBriefingSession: briefingSession,
      promptKind:
        audience === "public_web"
          ? "public-market-briefing-composition"
          : "telegram-personalized-report-composition",
      runDate: input.runDate
    },
    schema: DAILY_REPORT_JSON_SCHEMA
  };
}

export const DAILY_REPORT_JSON_SCHEMA = {
  type: "object",
  properties: {
    oneLineSummary: { type: "string" },
    marketBullets: { type: "array", items: { type: "string" } },
    macroBullets: { type: "array", items: { type: "string" } },
    fundFlowBullets: { type: "array", items: { type: "string" } },
    eventBullets: { type: "array", items: { type: "string" } },
    holdingTrendBullets: { type: "array", items: { type: "string" } },
    articleSummaryBullets: { type: "array", items: { type: "string" } },
    headlineEvents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          headline: { type: "string" },
          sourceLabel: { type: "string" },
          summary: { type: "string" }
        },
        required: ["headline", "sourceLabel", "summary"]
      }
    },
    strategyBullets: { type: "array", items: { type: "string" } },
    riskBullets: { type: "array", items: { type: "string" } },
    trendNewsBullets: { type: "array", items: { type: "string" } },
    newsReferences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sourceLabel: { type: "string" },
          title: { type: "string" },
          url: { type: "string" }
        },
        required: ["sourceLabel", "title", "url"]
      }
    }
  },
  required: [
    "oneLineSummary",
    "marketBullets",
    "macroBullets",
    "fundFlowBullets",
    "eventBullets",
    "holdingTrendBullets",
    "articleSummaryBullets",
    "headlineEvents",
    "strategyBullets",
    "riskBullets",
    "trendNewsBullets",
    "newsReferences"
  ]
};

export function parseDailyReportStructuredOutput(
  outputText: string
): DailyReportStructuredOutput {
  const parsed = JSON.parse(outputText) as Record<string, unknown>;

  if (
    typeof parsed.oneLineSummary !== "string" ||
    !isStringArray(parsed.marketBullets) ||
    !isStringArray(parsed.macroBullets) ||
    !isStringArray(parsed.fundFlowBullets) ||
    !isStringArray(parsed.eventBullets) ||
    !isStringArray(parsed.holdingTrendBullets) ||
    !isStringArray(parsed.articleSummaryBullets) ||
    !isHeadlineEventArray(parsed.headlineEvents) ||
    !isStringArray(parsed.strategyBullets) ||
    !isStringArray(parsed.riskBullets) ||
    !isStringArray(parsed.trendNewsBullets) ||
    !isNewsReferenceArray(parsed.newsReferences)
  ) {
    throw new Error("Daily report structured output is invalid");
  }

  return {
    oneLineSummary: parsed.oneLineSummary,
    marketBullets: parsed.marketBullets,
    macroBullets: parsed.macroBullets,
    fundFlowBullets: parsed.fundFlowBullets,
    eventBullets: parsed.eventBullets,
    holdingTrendBullets: parsed.holdingTrendBullets,
    articleSummaryBullets: parsed.articleSummaryBullets,
    headlineEvents: parsed.headlineEvents,
    strategyBullets: parsed.strategyBullets,
    riskBullets: parsed.riskBullets,
    trendNewsBullets: parsed.trendNewsBullets,
    newsReferences: parsed.newsReferences
  };
}

function buildPromptPayload(
  input: DailyReportPromptInput & {
    audience: DailyReportPromptAudience;
    briefingSession: BriefingSession;
  }
) {
  const marketAsOfDates = [
    ...new Set(
      input.marketResults.flatMap((result) =>
        result.status === "ok" ? [result.data.asOfDate] : []
      )
    )
  ].sort();

  return {
    audience: input.audience,
    briefingSession: input.briefingSession,
    runDate: input.runDate,
    dataAvailability: {
      eventInputAvailable: input.newsBriefs.some((brief) => brief.events.length > 0),
      fundFlowInputAvailable: false,
      holdingPriceInputAvailable: false,
      marketAsOfDates
    },
    holdings: input.holdings,
    marketResults: input.marketResults.map((result) =>
      result.status === "ok"
        ? {
            status: "ok",
            itemCode: result.data.itemCode,
            itemName: result.data.itemName,
            asOfDate: result.data.asOfDate,
            previousValue: result.data.previousValue ?? null,
            value: result.data.value,
            changePercent: result.data.changePercent ?? null
          }
        : {
            status: "error",
            sourceKey: result.sourceKey
          }
    ),
    newsBriefs: input.newsBriefs.map((brief) => ({
      holding: brief.holding,
      status: brief.status,
      events: brief.events.map((event) => ({
        eventType: event.eventType,
        headline: event.headline,
        summary: event.summary,
        sentiment: event.sentiment,
        confidence: event.confidence
      }))
    })),
    macroTrendBriefs: (input.macroTrendBriefs ?? []).map((brief) => ({
      theme: brief.theme,
      summary: brief.summary,
      sentiment: brief.sentiment,
      confidence: brief.confidence,
      references: brief.references,
      headlines: brief.headlines
    })),
    quantScorecards: input.quantScorecards.map((scorecard) => ({
      companyName: scorecard.companyName,
      symbol: scorecard.symbol ?? null,
      macroScore: scorecard.macroScore,
      trendScore: scorecard.trendScore,
      eventScore: scorecard.eventScore,
      flowScore: scorecard.flowScore,
      totalScore: scorecard.totalScore,
      action: scorecard.action,
      actionSummary: scorecard.actionSummary
    })),
    quantScenarios: input.quantScenarios,
    riskCheckpoints: input.riskCheckpoints,
    sessionComparison: input.sessionComparison ?? null,
    portfolioRebalancing: input.portfolioRebalancing ?? null
  };
}

function buildPromptInstructions(
  audience: DailyReportPromptAudience,
  briefingSession: BriefingSession
): string {
  const sharedInstructions = [
    "너의 역할은 제공된 계산 결과를 해석해 브리핑 문장을 조합하는 것이다.",
    "너는 계산 엔진이 아니다. 이미 제공된 점수, 액션, 리스크, 사실만 사용하고 재계산하지 않는다.",
    "입력에 없는 뉴스, 숫자, 일정, 기업 특성, 가격 패턴, 추가 로직을 만들지 않는다.",
    "최신 core spec이 이미 upstream에서 정의돼 있다고 가정하고, 전달된 결과를 해석만 한다.",
    "hard rule 또는 제약 문구가 있으면 그것을 가장 먼저 설명하고, 강한 점수나 모멘텀이 제약을 뒤집지 못하게 한다.",
    "시장 해석은 가능하면 `시장 종합 -> 심리/강도 -> 밸류/펀더멘털 -> 구조 리스크` 순서로 정리한다.",
    "심리와 표면 강도가 버티더라도 밸류 부담이나 구조 리스크가 높으면 방어적 해석을 우선한다.",
    "marketResults의 asOfDate가 서로 다르면 같은 시점의 동시 움직임처럼 과장하지 말고 최근 가용 데이터 기준 해석을 유지한다.",
    "모든 문장은 한국어 존댓말로 짧고 단정하게 작성한다.",
    "날짜와 수치 블록은 renderer가 따로 보여주므로, 본문에서는 숫자 반복보다 해석과 행동 의미를 우선한다.",
    "portfolioRebalancing 객체가 있으면 그 안의 hard rule, final action, 시장 레짐, 포트 요약을 우선 해석한다.",
    "입력에 실제 자금 데이터가 없으면 fundFlowBullets는 반드시 빈 배열로 반환하고, 환율·지수 움직임만으로 외국인/기관/ETF flow를 추정하지 않는다.",
    "입력에 명시적인 이벤트 데이터가 없으면 eventBullets는 반드시 빈 배열로 반환한다.",
    "정보가 부족한 섹션은 빈 배열로 반환한다.",
    "배열 각 항목은 바로 bullet로 붙일 수 있게 독립 문장으로 작성한다.",
    "marketBullets는 최대 5개, macroBullets는 최대 4개, fundFlowBullets는 최대 3개, eventBullets는 최대 5개, holdingTrendBullets는 최대 4개, articleSummaryBullets는 최대 4개, headlineEvents는 최대 4개, strategyBullets는 최대 4개, riskBullets는 최대 3개, trendNewsBullets는 최대 5개로 제한한다."
  ];

  if (audience === "public_web") {
    return [
      "너는 공개 웹용 한국어 시장 브리핑 작성기다.",
      "개인 포트폴리오 리밸런싱 리포트가 아니라, 공개 가능한 시장 해석 페이지를 작성한다.",
      briefingSession === "pre_market"
        ? "현재 세션은 장 시작 전 브리핑이다. 미장 마감 분석을 바탕으로 국장 시초가와 장 초반 수급 방향을 읽는 데 집중한다."
        : briefingSession === "post_market"
          ? "현재 세션은 장 마감 후 브리핑이다. 국장과 대체거래소 결과를 바탕으로 오늘 밤 미장 방향을 예보하는 데 집중한다."
          : "현재 세션은 주말 브리핑이다. 주간 이슈를 압축하고 다음 주 주요 일정을 정리하는 데 집중한다.",
      "개인 보유 종목, 목표 비중, 포트 적합성, 사용자 맞춤 hard rule, 개인 행동 지시처럼 읽히는 문장은 쓰지 않는다.",
      "비중 확대, 축소 우선, 교체 검토, 매수 기회, 지금 사야 한다 같은 개인 행동 언어를 쓰지 않는다.",
      "표면 모멘텀이 유지돼도 내부 밸류 부담과 구조적 취약성이 크면 균형 잡힌 경고 톤을 유지한다.",
      "oneLineSummary는 `오늘 한 줄 요약`에 들어갈 문장으로 작성하고, 시장 톤과 핵심 해석 포인트를 1문장으로 정리한다.",
      "marketBullets는 `시장 종합 해석` 섹션용 문장으로 작성한다. 첫 번째 문장은 반드시 이번 브리핑의 역할과 해석 목적을 직접 드러내야 한다.",
      "macroBullets는 `글로벌/국내 시장 스냅샷`과 `거시 관점`에 재사용될 수 있게 작성한다.",
      "fundFlowBullets는 breadth, rotation, leadership, sector/style 흐름이 실제로 입력된 경우에만 작성한다.",
      "headlineEvents는 실제로 입력된 RSS 기사 headline과 reference만 사용해 작성한다. 각 항목은 `주요 뉴스 헤드라인 + 브리핑용 요약 제안` 구조로 이어질 수 있어야 하며, headline을 새로 만들거나 합치지 않는다.",
      briefingSession === "pre_market"
        ? "eventBullets는 `오늘 대응 기준` 섹션용 체크포인트를 작성한다."
        : briefingSession === "post_market"
          ? "eventBullets는 `오늘 밤 체크포인트` 섹션용 체크포인트를 작성한다."
          : "eventBullets는 `다음 주 주요 일정 요약` 섹션용 체크포인트와 캘린더를 작성한다.",
      "trendNewsBullets는 거시 트렌드 뉴스의 함의를 짧게 정리한다.",
      "newsReferences는 headlineEvents와 trendNewsBullets를 뒷받침하는 공개 링크만 요약한다.",
      "holdingTrendBullets, articleSummaryBullets, strategyBullets는 공개 웹에서는 사용하지 않으므로 반드시 빈 배열로 반환한다.",
      "riskBullets는 공개 시장 차원의 리스크 포인트만 작성하고 개인 보유 종목 전제를 넣지 않는다.",
      briefingSession === "post_market"
        ? "sessionComparison이 있으면 오전 프레임 대비 실제 결과와 해석 보정 포인트를 자연스럽게 반영한다."
        : briefingSession === "weekend_briefing"
          ? "주말 브리핑에서는 주중 반복된 테마와 다음 주 선행 체크포인트를 우선 정리한다."
          : "장 시작 전 브리핑에서는 검증보다는 국장 시초가 예측과 초기 수급 체크포인트를 우선 정리한다.",
      ...sharedInstructions
    ].join("\n");
  }

  return [
    "너는 텔레그램 DM용 개인화 포트폴리오 리밸런싱 브리핑 작성기다.",
    "일반 시장 요약이 아니라 `오늘 이 사용자의 포트폴리오에서 무엇을 해야 하는가`를 짧고 실용적으로 설명한다.",
    briefingSession === "pre_market"
      ? "현재 세션은 장 시작 전 브리핑이다. 판단 프레임, 오늘의 체크포인트, 리밸런싱 기준을 우선 정리한다."
      : briefingSession === "post_market"
        ? "현재 세션은 장 마감 후 브리핑이다. 오전 가설 대비 실제 결과를 검증하고, 기준을 어떻게 보정할지 우선 정리한다."
        : "현재 세션은 주말 브리핑이다. 다음 주 대응 프레임과 포트 리스크 보정 포인트를 우선 정리한다.",
    "설명 우선순위는 `제약/하드룰 -> 최종 action 또는 actionSummary -> 점수/시장 레짐 -> 기타 사실` 순서를 따른다.",
    "종목이 좋아 보여도 과비중, 집중도, 상관관계, 이벤트 임박, 방어적 시장 레짐이 있으면 먼저 제약을 설명한다.",
    "입력의 quantScorecards.action과 actionSummary, quantScenarios, riskCheckpoints를 upstream 최종 판단으로 존중하고 방향을 뒤집지 않는다.",
    "portfolioRebalancing가 있으면 내재 가치, 가격/추세, 미래 기대치, 포트 적합성, 시장 레짐 오버레이, 하드룰을 먼저 반영한다.",
    "oneLineSummary는 `오늘 한 줄 결론`에 들어갈 문장으로 작성하고, 포트 대응 스탠스와 시장 레짐 톤을 함께 담는다.",
    "strategyBullets는 `포트폴리오 리밸런싱 제안`에 바로 쓸 수 있게 작성하고, 확대/유지/축소/관찰 방향이 드러나야 한다.",
    "holdingTrendBullets는 종목별 `한줄 판단` 또는 보유 종목 가이드로 재사용될 수 있게 작성한다.",
    "articleSummaryBullets는 종목 관련 핵심 기사, 이벤트, 제공 사실을 간단히 묶어준다.",
    "headlineEvents는 개인화 경로에서는 사용하지 않으므로 반드시 빈 배열로 반환한다.",
    "trendNewsBullets는 거시 트렌드 뉴스가 있을 때만 짧게 정리하고, 없으면 빈 배열로 반환한다.",
    "newsReferences는 공개 링크만 넣고, 개인화 경로에서는 비어 있어도 된다.",
    "입력에 실제 종목 기사나 이벤트가 없으면 articleSummaryBullets는 반드시 빈 배열로 반환한다.",
    "입력에 종목별 가격/추세 사실이 없으면 holdingTrendBullets는 반드시 빈 배열로 반환하고 업종 일반론으로 종목 동향을 추정하지 않는다.",
    "riskBullets는 오늘 포트폴리오에서 바로 점검해야 할 집중, 이벤트, 상관, 방어적 해석 필요성을 짧게 정리한다.",
    briefingSession === "post_market"
      ? "sessionComparison이 있으면 오전 판단과 실제 결과의 차이, 보정 포인트를 oneLineSummary와 strategyBullets에 녹인다."
      : briefingSession === "weekend_briefing"
        ? "주말 브리핑에서는 다음 주 첫 세션 대응 기준과 대기 리스크를 선명하게 제시한다."
        : "장 시작 전 브리핑에서는 검증 어조보다 오늘 무엇을 기준으로 대응할지 선명하게 제시한다.",
    "시장 과열, 블랙스완, 극단적 고평가가 함께 보이면 보수적·중립적 해석의 확대 톤을 자동으로 약화한다.",
    ...sharedInstructions
  ].join("\n");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNewsReferenceArray(
  value: unknown
): value is Array<{ sourceLabel: string; title: string; url: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).sourceLabel === "string" &&
        typeof (item as Record<string, unknown>).title === "string" &&
        typeof (item as Record<string, unknown>).url === "string"
    )
  );
}

function isHeadlineEventArray(
  value: unknown
): value is Array<{ headline: string; sourceLabel: string; summary: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).headline === "string" &&
        typeof (item as Record<string, unknown>).sourceLabel === "string" &&
        typeof (item as Record<string, unknown>).summary === "string"
    )
  );
}
