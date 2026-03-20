import type {
  MarketDataAdapter,
  MarketDataFetchResult,
  MarketDataItemRequest,
  MarketDataPoint
} from "./market-data.js";

const FRED_SERIES_BY_SOURCE_KEY: Record<string, string> = {
  "commodity:HENRY_HUB_NATURAL_GAS": "DHHNGSP",
  "commodity:WTI": "DCOILWTICO",
  "fx:USDKRW": "DEXKOUS",
  "index:CBOE:VIX": "VIXCLS",
  "index:DJI": "DJIA",
  "index:NASDAQ:IXIC": "NASDAQCOM",
  "index:SP:SPX": "SP500",
  "rate:US10Y": "DGS10"
};

type FredObservation = {
  date: string;
  value: string;
};

type FredObservationsResponse = {
  observations?: FredObservation[];
};

export class FredMarketDataAdapter implements MarketDataAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: {
    apiKey: string;
    baseUrl?: string;
    fetchFn?: typeof fetch;
  }) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.stlouisfed.org/fred/series/observations";
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async fetchMany(items: MarketDataItemRequest[]): Promise<MarketDataFetchResult[]> {
    return Promise.all(items.map((item) => this.fetchOne(item)));
  }

  private async fetchOne(item: MarketDataItemRequest): Promise<MarketDataFetchResult> {
    const seriesId = FRED_SERIES_BY_SOURCE_KEY[item.sourceKey];

    if (!seriesId) {
      return {
        status: "error",
        errorCode: "unsupported_source",
        sourceKey: item.sourceKey,
        message: `FRED adapter does not support source key: ${item.sourceKey}`
      };
    }

    try {
      const response = await this.fetchFn(buildFredUrl(this.baseUrl, this.apiKey, seriesId));

      if (!response.ok) {
        return {
          status: "error",
          errorCode: "provider_error",
          sourceKey: item.sourceKey,
          message: `FRED request failed with status ${response.status}`
        };
      }

      const body = (await response.json()) as FredObservationsResponse;
      const point = buildMarketDataPoint(item, body.observations ?? []);

      if (!point) {
        return {
          status: "error",
          errorCode: "provider_error",
          sourceKey: item.sourceKey,
          message: `FRED returned insufficient observations for source key: ${item.sourceKey}`
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
            : `Unknown FRED error for source key: ${item.sourceKey}`
      };
    }
  }
}

function buildFredUrl(baseUrl: string, apiKey: string, seriesId: string): URL {
  const url = new URL(baseUrl);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "10");

  return url;
}

function buildMarketDataPoint(
  item: MarketDataItemRequest,
  observations: FredObservation[]
): MarketDataPoint | null {
  const numericObservations = observations
    .map((observation) => ({
      asOfDate: observation.date,
      value: Number(observation.value)
    }))
    .filter((observation) => Number.isFinite(observation.value));

  if (numericObservations.length === 0) {
    return null;
  }

  const latest = numericObservations[0];

  if (!latest) {
    return null;
  }

  const previous = numericObservations[1];
  const dataPoint: MarketDataPoint = {
    itemCode: item.itemCode,
    itemName: item.itemName,
    sourceKey: item.sourceKey,
    source: "fred",
    asOfDate: latest.asOfDate,
    value: latest.value
  };

  if (previous) {
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
