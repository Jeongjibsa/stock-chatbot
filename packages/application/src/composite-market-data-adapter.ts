import type {
  MarketDataAdapter,
  MarketDataFetchResult,
  MarketDataItemRequest
} from "./market-data.js";

const YAHOO_ROUTED_SOURCE_KEYS = new Set([
  "index:CBOE:VIX",
  "index:DJI",
  "index:KRX:KOSDAQ",
  "index:KRX:KOSPI",
  "index:NASDAQ:IXIC",
  "index:SP:SPX"
]);

export class CompositeMarketDataAdapter implements MarketDataAdapter {
  constructor(
    private readonly dependencies: {
      fredAdapter: MarketDataAdapter;
      yahooFinanceAdapter: MarketDataAdapter;
    }
  ) {}

  async fetchMany(items: MarketDataItemRequest[]): Promise<MarketDataFetchResult[]> {
    const results = await Promise.all(items.map((item) => this.fetchOne(item)));

    return results;
  }

  private async fetchOne(item: MarketDataItemRequest): Promise<MarketDataFetchResult> {
    const primaryAdapter = YAHOO_ROUTED_SOURCE_KEYS.has(item.sourceKey)
      ? this.dependencies.yahooFinanceAdapter
      : this.dependencies.fredAdapter;
    const fallbackAdapter =
      primaryAdapter === this.dependencies.yahooFinanceAdapter
        ? this.dependencies.fredAdapter
        : this.dependencies.yahooFinanceAdapter;
    const primaryResult = await primaryAdapter.fetchMany([item]);
    const firstPrimary = primaryResult[0];

    if (!firstPrimary) {
      return {
        status: "error",
        errorCode: "provider_error",
        sourceKey: item.sourceKey,
        message: `Composite adapter returned no result for source key: ${item.sourceKey}`
      };
    }

    if (firstPrimary.status === "ok") {
      return firstPrimary;
    }

    if (firstPrimary.errorCode !== "provider_error") {
      return firstPrimary;
    }

    const fallbackResult = await fallbackAdapter.fetchMany([item]);
    const firstFallback = fallbackResult[0];

    return firstFallback ?? firstPrimary;
  }
}
