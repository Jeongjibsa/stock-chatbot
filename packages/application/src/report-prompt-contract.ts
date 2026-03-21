import type { HoldingNewsBrief } from "./news.js";
import type { MarketDataFetchResult } from "./market-data.js";

export type DailyReportPromptInput = {
  marketResults: MarketDataFetchResult[];
  newsBriefs: HoldingNewsBrief[];
  quantScenarios: string[];
  riskCheckpoints: string[];
  runDate: string;
};

export type DailyReportStructuredOutput = {
  macroSummary: string;
  oneLineSummary: string;
  portfolioBullets: string[];
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
      "너는 아침 투자 브리핑 작성기야.",
      "반드시 JSON 객체만 반환해.",
      "키는 oneLineSummary, macroSummary, portfolioBullets, strategyBullets, riskBullets만 사용해.",
      "portfolioBullets, strategyBullets, riskBullets는 문자열 배열이어야 해.",
      "모든 문장은 한국어로 짧고 단정하게 작성해."
    ].join("\n"),
    input: JSON.stringify({
      runDate: input.runDate,
      marketResults: input.marketResults,
      newsBriefs: input.newsBriefs,
      quantScenarios: input.quantScenarios,
      riskCheckpoints: input.riskCheckpoints
    }),
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
    typeof parsed.macroSummary !== "string" ||
    !isStringArray(parsed.portfolioBullets) ||
    !isStringArray(parsed.strategyBullets) ||
    !isStringArray(parsed.riskBullets)
  ) {
    throw new Error("Daily report structured output is invalid");
  }

  return {
    oneLineSummary: parsed.oneLineSummary,
    macroSummary: parsed.macroSummary,
    portfolioBullets: parsed.portfolioBullets,
    strategyBullets: parsed.strategyBullets,
    riskBullets: parsed.riskBullets
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
