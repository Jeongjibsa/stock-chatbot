import type { HoldingNewsBrief } from "./news.js";
import type { MarketDataFetchResult } from "./market-data.js";

export type DailyReportPromptInput = {
  holdings: Array<{
    companyName: string;
    exchange: string;
    symbol: string;
  }>;
  marketResults: MarketDataFetchResult[];
  newsBriefs: HoldingNewsBrief[];
  quantScenarios: string[];
  riskCheckpoints: string[];
  runDate: string;
};

export type DailyReportStructuredOutput = {
  articleSummaryBullets: string[];
  holdingTrendBullets: string[];
  keyIndicatorBullets: string[];
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
      "반드시 JSON 객체만 반환한다.",
      "최상위 키는 oneLineSummary, keyIndicatorBullets, holdingTrendBullets, articleSummaryBullets, strategyBullets, riskBullets만 사용한다.",
      "oneLineSummary는 한 문장 문자열이어야 한다.",
      "나머지 키는 문자열 배열이어야 한다.",
      "모든 문장은 한국어 존댓말로 짧고 단정하게 작성한다.",
      "시장 스냅샷의 숫자를 다시 길게 반복하지 말고 해석 중심으로 작성한다.",
      "입력에 없는 기업 사실, 기사 사실, 수치를 추측해서 만들지 않는다.",
      "정보가 부족한 섹션은 빈 배열로 반환한다.",
      "배열 각 항목은 텔레그램에서 바로 bullet로 붙일 수 있게 독립 문장으로 작성한다.",
      "keyIndicatorBullets는 최대 3개, holdingTrendBullets는 최대 3개, articleSummaryBullets는 최대 4개, strategyBullets는 최대 3개, riskBullets는 최대 3개로 제한한다."
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
    !isStringArray(parsed.keyIndicatorBullets) ||
    !isStringArray(parsed.holdingTrendBullets) ||
    !isStringArray(parsed.articleSummaryBullets) ||
    !isStringArray(parsed.strategyBullets) ||
    !isStringArray(parsed.riskBullets)
  ) {
    throw new Error("Daily report structured output is invalid");
  }

  return {
    oneLineSummary: parsed.oneLineSummary,
    keyIndicatorBullets: parsed.keyIndicatorBullets,
    holdingTrendBullets: parsed.holdingTrendBullets,
    articleSummaryBullets: parsed.articleSummaryBullets,
    strategyBullets: parsed.strategyBullets,
    riskBullets: parsed.riskBullets
  };
}

function buildPromptPayload(input: DailyReportPromptInput) {
  return {
    runDate: input.runDate,
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
    quantScenarios: input.quantScenarios,
    riskCheckpoints: input.riskCheckpoints
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
