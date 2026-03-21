import type { HoldingNewsBrief } from "./news.js";
import type { MarketDataFetchResult } from "./market-data.js";
import type { QuantScorecard } from "./quant-scorecard.js";

export type DailyReportPromptInput = {
  holdings: Array<{
    companyName: string;
    exchange: string;
    symbol: string;
  }>;
  marketResults: MarketDataFetchResult[];
  newsBriefs: HoldingNewsBrief[];
  quantScorecards: QuantScorecard[];
  quantScenarios: string[];
  riskCheckpoints: string[];
  runDate: string;
};

export type DailyReportStructuredOutput = {
  articleSummaryBullets: string[];
  eventBullets: string[];
  fundFlowBullets: string[];
  holdingTrendBullets: string[];
  macroBullets: string[];
  marketBullets: string[];
  oneLineSummary: string;
  riskBullets: string[];
  strategyBullets: string[];
};

export function buildDailyReportPromptContract(
  input: DailyReportPromptInput
): {
  input: string;
  instructions: string;
  metadata: Record<string, string>;
} {
  return {
    instructions: [
      "너는 텔레그램용 아침 주식 브리핑 해설 작성기다.",
      "단순 뉴스 요약이 아니라, 현재 시장 상태를 파악하고 사용자의 행동 판단을 돕는 행동 중심 리포트를 작성한다.",
      "반드시 JSON 객체만 반환한다.",
      "최상위 키는 oneLineSummary, marketBullets, macroBullets, fundFlowBullets, eventBullets, holdingTrendBullets, articleSummaryBullets, strategyBullets, riskBullets만 사용한다.",
      "oneLineSummary는 한 문장 문자열이어야 한다.",
      "나머지 키는 문자열 배열이어야 한다.",
      "모든 문장은 한국어 존댓말로 짧고 단정하게 작성한다.",
      "리포트 제목은 별도로 `오늘의 브리핑 (YYYY-MM-DD 기준)` 형식으로 렌더링되므로 본문에서 날짜를 반복하지 않는다.",
      "거시 시장 스냅샷은 별도 숫자 블록으로 렌더링되므로 날짜나 수치를 다시 길게 반복하지 말고 해석 중심으로 작성한다.",
      "marketBullets, macroBullets, fundFlowBullets는 텔레그램의 `시장, 매크로, 자금 브리핑` 섹션에서 각각 `[시장]`, `[매크로]`, `[자금]`으로 묶여 보여도 자연스러운 문장으로 작성한다.",
      "articleSummaryBullets는 `종목 관련 핵심 기사 및 이벤트 요약` 섹션에 바로 들어갈 수 있게 작성한다.",
      "eventBullets는 `주요 일정 및 이벤트 브리핑` 섹션에 자연스럽게 들어갈 수 있는 문장으로 작성한다.",
      "입력에 없는 기업 사실, 기사 사실, 수치를 추측해서 만들지 않는다.",
      "입력에 실제 자금 데이터가 없으면 fundFlowBullets는 반드시 빈 배열로 반환하고, 환율·지수 움직임만으로 외국인/기관/ETF flow를 추정하지 않는다.",
      "입력에 실제 종목 기사나 이벤트가 없으면 articleSummaryBullets는 반드시 빈 배열로 반환한다.",
      "입력에 종목별 시세나 전일 종가 정보가 없으면 holdingTrendBullets는 반드시 빈 배열로 반환하고, 업종 일반론으로 종목 동향을 추정하지 않는다.",
      "입력에 명시적인 이벤트 데이터가 없으면 eventBullets는 반드시 빈 배열로 반환한다.",
      "marketResults의 asOfDate가 서로 다르면, 같은 시점의 동시 움직임처럼 과장하지 말고 최근 가용 데이터 기준 해석이라는 전제를 유지한다.",
      "한 줄 요약과 전략 문장은 가장 강한 2개 신호를 우선 반영하고, 근거가 약한 추론은 넣지 않는다.",
      "정보가 부족한 섹션은 빈 배열로 반환한다.",
      "배열 각 항목은 텔레그램에서 바로 bullet로 붙일 수 있게 독립 문장으로 작성한다.",
      "oneLineSummary는 가능하면 `현재 시장 상태 -> 권장 대응` 형태의 행동 문장으로 작성한다.",
      "strategyBullets는 요약보다 더 구체적인 행동 제안이 되도록 작성하고, 필요하면 점수나 상태 판단을 먼저 제시한 뒤 대응을 제안한다.",
      "입력의 quantScorecards가 있으면 그 점수와 action을 존중해 strategyBullets의 톤과 대응 강도를 맞춘다.",
      "riskBullets는 사용자가 당장 체크해야 할 위험요인을 짧고 직관적으로 정리한다.",
      "marketBullets는 최대 4개, macroBullets는 최대 4개, fundFlowBullets는 최대 3개, eventBullets는 최대 5개, holdingTrendBullets는 최대 3개, articleSummaryBullets는 최대 4개, strategyBullets는 최대 3개, riskBullets는 최대 3개로 제한한다.",
      "시장 섹션에는 S&P500, NASDAQ, KOSPI, KOSDAQ, DOW, VIX 관련 방향 해석을 우선 반영한다.",
      "매크로 섹션에는 미국 10년물 금리, 기준금리, CPI 발표 여부, 달러 인덱스 관련 해석을 우선 반영한다.",
      "자금 섹션에는 한국 외국인/기관 수급과 ETF flow가 입력에 없으면 빈 배열을 반환한다.",
      "이벤트 섹션에는 주요 뉴스 3~5개, 예정 실적 발표 일정, 지정학 리스크, AI/반도체/원자재 이슈를 입력 범위 안에서만 요약한다."
    ].join("\n"),
    input: JSON.stringify(buildPromptPayload(input)),
    metadata: {
      promptKind: "market-report-composition",
      runDate: input.runDate
    }
  };
}

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
    !isStringArray(parsed.strategyBullets) ||
    !isStringArray(parsed.riskBullets)
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
    strategyBullets: parsed.strategyBullets,
    riskBullets: parsed.riskBullets
  };
}

function buildPromptPayload(input: DailyReportPromptInput) {
  const marketAsOfDates = [
    ...new Set(
      input.marketResults.flatMap((result) =>
        result.status === "ok" ? [result.data.asOfDate] : []
      )
    )
  ].sort();

  return {
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
            sourceKey: result.sourceKey,
            message: result.message
          }
    ),
    newsBriefs: input.newsBriefs.map((brief) => ({
      holding: brief.holding,
      status: brief.status,
      errorMessage: brief.errorMessage ?? null,
      events: brief.events.map((event) => ({
        eventType: event.eventType,
        headline: event.headline,
        summary: event.summary,
        sentiment: event.sentiment,
        confidence: event.confidence
      }))
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
    riskCheckpoints: input.riskCheckpoints
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
