import type { MarketDataFetchResult } from "./market-data.js";

const KR_SESSION_ITEM_CODES = ["KOSPI", "KOSDAQ"] as const;
const US_SESSION_ITEM_CODES = ["NASDAQ", "SP500", "DOW", "VIX", "US10Y", "DXY"] as const;

export type EffectiveReportDateResolution = {
  effectiveReportDate: string;
  krSessionDate?: string;
  requestedSeoulDate: string;
  usSessionDate?: string;
};

export function resolveEffectiveReportDate(input: {
  marketResults: MarketDataFetchResult[];
  requestedSeoulDate: string;
}): EffectiveReportDateResolution {
  const krSessionDate = resolveSessionDate(input.marketResults, KR_SESSION_ITEM_CODES);
  const usSessionDate = resolveSessionDate(input.marketResults, US_SESSION_ITEM_CODES);
  const effectiveReportDate =
    [krSessionDate, usSessionDate]
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? input.requestedSeoulDate;

  return {
    requestedSeoulDate: input.requestedSeoulDate,
    effectiveReportDate,
    ...(krSessionDate ? { krSessionDate } : {}),
    ...(usSessionDate ? { usSessionDate } : {})
  };
}

function resolveSessionDate(
  marketResults: MarketDataFetchResult[],
  itemCodes: readonly string[]
): string | undefined {
  const dates = marketResults
    .flatMap((result) =>
      result.status === "ok" && itemCodes.includes(result.data.itemCode)
        ? [result.data.asOfDate]
        : []
    )
    .sort();

  return dates.at(-1);
}
