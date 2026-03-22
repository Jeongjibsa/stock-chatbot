import type {
  MarketDataAdapter,
  MarketDataFetchResult,
  MarketDataItemRequest,
  MarketDataPoint
} from "./market-data.js";

const YAHOO_SYMBOL_BY_SOURCE_KEY: Record<string, string> = {
  "index:CBOE:VIX": "^VIX",
  "index:DJI": "^DJI",
  "index:KRX:KOSDAQ": "^KQ11",
  "index:KRX:KOSPI": "^KS11",
  "index:NASDAQ:IXIC": "^IXIC",
  "index:SP:SPX": "^GSPC"
};

type YahooChartResponse = {
  chart?: {
    error?: {
      code?: string;
      description?: string;
    } | null;
    result?: Array<{
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
      meta?: {
        currency?: string;
      };
      timestamp?: number[];
    }>;
  };
};

export class YahooFinanceScrapingMarketDataAdapter implements MarketDataAdapter {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: {
    baseUrl?: string;
    fetchFn?: typeof fetch;
  }) {
    this.baseUrl = options?.baseUrl ?? "https://query1.finance.yahoo.com/v8/finance/chart";
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  async fetchMany(items: MarketDataItemRequest[]): Promise<MarketDataFetchResult[]> {
    return Promise.all(items.map((item) => this.fetchOne(item)));
  }

  private async fetchOne(item: MarketDataItemRequest): Promise<MarketDataFetchResult> {
    const symbol = YAHOO_SYMBOL_BY_SOURCE_KEY[item.sourceKey];

    if (!symbol) {
      return {
        status: "error",
        errorCode: "unsupported_source",
        sourceKey: item.sourceKey,
        message: `Yahoo Finance adapter does not support source key: ${item.sourceKey}`
      };
    }

    try {
      const response = await this.fetchFn(buildYahooUrl(this.baseUrl, symbol), {
        headers: {
          "user-agent": "Mozilla/5.0 stock-chatbot/1.0"
        }
      });

      if (!response.ok) {
        return {
          status: "error",
          errorCode: "provider_error",
          sourceKey: item.sourceKey,
          message: `Yahoo Finance request failed with status ${response.status}`
        };
      }

      const body = (await response.json()) as YahooChartResponse;
      const point = buildYahooMarketDataPoint(item, body);

      if (!point) {
        const providerError = body.chart?.error;

        return {
          status: "error",
          errorCode: "provider_error",
          sourceKey: item.sourceKey,
          message:
            providerError?.description ??
            `Yahoo Finance returned insufficient data for source key: ${item.sourceKey}`
        };
      }

      return {
        status: "ok",
        data: point
      };
    } catch (error) {
      return {
        status: "error",
        errorCode: "provider_error",
        sourceKey: item.sourceKey,
        message:
          error instanceof Error
            ? error.message
            : `Unknown Yahoo Finance error for source key: ${item.sourceKey}`
      };
    }
  }
}

function buildYahooUrl(baseUrl: string, symbol: string): URL {
  const url = new URL(`${baseUrl}/${encodeURIComponent(symbol)}`);

  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "1mo");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");

  return url;
}

function buildYahooMarketDataPoint(
  item: MarketDataItemRequest,
  body: YahooChartResponse
): MarketDataPoint | null {
  const result = body.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const paired = timestamps
    .map((timestamp, index) => {
      const close = closes[index];

      if (close === null || close === undefined || !Number.isFinite(close)) {
        return null;
      }

      return {
        asOfDate: new Date(timestamp * 1000).toISOString().slice(0, 10),
        value: close
      };
    })
    .filter((entry): entry is { asOfDate: string; value: number } => entry !== null);
  const dedupedByDate = [...new Map(paired.map((entry) => [entry.asOfDate, entry])).values()];

  const latestAllowedDate = item.asOfDate ?? "9999-12-31";
  const filteredByAsOfDate = dedupedByDate.filter(
    (entry) => entry.asOfDate <= latestAllowedDate
  );
  const latest = filteredByAsOfDate.at(-1);

  if (!latest) {
    return null;
  }

  const previous = filteredByAsOfDate.at(-2);
  const dataPoint: MarketDataPoint = {
    itemCode: item.itemCode,
    itemName: item.itemName,
    sourceKey: item.sourceKey,
    source: "yahoo_finance",
    asOfDate: latest.asOfDate,
    value: roundToFour(latest.value)
  };

  if (previous) {
    dataPoint.previousValue = roundToFour(previous.value);
    dataPoint.changeValue = roundToFour(latest.value - previous.value);

    if (previous.value !== 0) {
      dataPoint.changePercent = roundToFour(
        ((latest.value - previous.value) / previous.value) * 100
      );
    }
  }

  return dataPoint;
}

function roundToFour(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
