import type { MarketDataFetchResult } from "./market-data.js";

export type PublicDailyBriefing = {
  archivePath: string;
  canonicalPath: string;
  disclaimer: string;
  eventBullets: string[];
  excludedTelegramOnlySections: string[];
  fundFlowBullets: string[];
  keyIndicatorBullets: string[];
  macroBullets: string[];
  marketBullets: string[];
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
  summaryLine: string;
  title: string;
};

const EXCLUDED_TELEGRAM_ONLY_SECTIONS = [
  "holdings",
  "holdingTrendBullets",
  "articleSummaryBullets",
  "portfolioNewsBriefs",
  "personalizedQuantScorecards"
] as const;

export function buildPublicDailyBriefing(input: {
  eventBullets?: string[];
  fundFlowBullets?: string[];
  keyIndicatorBullets?: string[];
  macroBullets?: string[];
  marketBullets?: string[];
  marketResults: MarketDataFetchResult[];
  riskBullets?: string[];
  runDate: string;
  summaryLine: string;
}): PublicDailyBriefing {
  return {
    title: `오늘의 브리핑 (${input.runDate} 기준)`,
    runDate: input.runDate,
    summaryLine: input.summaryLine,
    marketSnapshot: input.marketResults
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
      })),
    keyIndicatorBullets: input.keyIndicatorBullets ?? [],
    marketBullets: input.marketBullets ?? [],
    macroBullets: input.macroBullets ?? [],
    fundFlowBullets: input.fundFlowBullets ?? [],
    eventBullets: input.eventBullets ?? [],
    riskBullets: input.riskBullets ?? [],
    canonicalPath: buildPublicBriefingCanonicalPath(input.runDate),
    archivePath: buildPublicBriefingArchivePath(input.runDate),
    excludedTelegramOnlySections: [...EXCLUDED_TELEGRAM_ONLY_SECTIONS],
    disclaimer: "이 브리핑은 공개 가능한 시장 요약만 포함하며, 개인화된 보유 종목 정보는 제외됩니다."
  };
}

export function buildPublicBriefingCanonicalPath(runDate: string): string {
  return `/briefings/${runDate}/`;
}

export function buildPublicBriefingUrl(baseUrl: string, runDate: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return `${normalizedBaseUrl}${buildPublicBriefingCanonicalPath(runDate)}`;
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

export function buildPublicBriefingArchivePath(runDate: string): string {
  const [year, month, day] = runDate.split("-");

  if (!year || !month || !day) {
    throw new Error(`Invalid runDate: ${runDate}`);
  }

  return `/briefings/${year}/${month}/${day}/`;
}
