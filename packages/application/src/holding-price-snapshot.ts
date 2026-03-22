export type HoldingPriceSnapshot = {
  asOfDate: string;
  changePercent?: number;
  currentPrice: number;
  previousClose?: number;
};

type HistoricalDailyClose = {
  close: number;
  date: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
      timestamp?: number[];
    }>;
  };
};

export type HoldingPriceSnapshotProvider = {
  getHoldingPriceSnapshot(input: {
    exchange: string | null;
    runDate: string;
    symbol: string | null;
  }): Promise<HoldingPriceSnapshot | null>;
};

export function resolveYahooSymbolCandidates(input: {
  exchange: string | null;
  symbol: string | null;
}): string[] {
  const symbol = input.symbol?.trim();

  if (!symbol) {
    return [];
  }

  if (input.exchange === "KR" && /^\d{6}$/.test(symbol)) {
    return [`${symbol}.KS`, `${symbol}.KQ`];
  }

  return [symbol];
}

export class YahooHoldingPriceSnapshotProvider
  implements HoldingPriceSnapshotProvider
{
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: {
    baseUrl?: string;
    fetchFn?: typeof fetch;
  }) {
    this.baseUrl =
      options?.baseUrl ?? "https://query1.finance.yahoo.com/v8/finance/chart";
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  async getHoldingPriceSnapshot(input: {
    exchange: string | null;
    runDate: string;
    symbol: string | null;
  }): Promise<HoldingPriceSnapshot | null> {
    const candidates = resolveYahooSymbolCandidates(input);

    for (const candidate of candidates) {
      const closes = await this.fetchSingleSymbol(candidate, input.runDate);

      if (closes && closes.length > 0) {
        return toHoldingPriceSnapshot(closes);
      }
    }

    return null;
  }

  private async fetchSingleSymbol(
    symbol: string,
    runDate: string
  ): Promise<HistoricalDailyClose[] | null> {
    try {
      const response = await this.fetchFn(buildYahooUrl(this.baseUrl, symbol), {
        headers: {
          "user-agent": "Mozilla/5.0 stock-chatbot/1.0"
        }
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as YahooChartResponse;
      const closes = toHistoricalDailyCloses(body);

      if (!closes) {
        return null;
      }

      return closes.filter((close) => close.date <= runDate);
    } catch {
      return null;
    }
  }
}

function buildYahooUrl(baseUrl: string, symbol: string): URL {
  const url = new URL(`${baseUrl}/${encodeURIComponent(symbol)}`);

  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "6mo");
  url.searchParams.set("includePrePost", "false");

  return url;
}

function toHistoricalDailyCloses(
  body: YahooChartResponse
): HistoricalDailyClose[] | null {
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
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        close
      };
    })
    .filter((entry): entry is HistoricalDailyClose => entry !== null);

  if (paired.length === 0) {
    return null;
  }

  return [...new Map(paired.map((entry) => [entry.date, entry])).values()];
}

function toHoldingPriceSnapshot(
  closes: HistoricalDailyClose[]
): HoldingPriceSnapshot | null {
  const latest = closes.at(-1);

  if (!latest) {
    return null;
  }

  const previous = closes.length >= 2 ? closes.at(-2) : undefined;
  const snapshot: HoldingPriceSnapshot = {
    asOfDate: latest.date,
    currentPrice: latest.close
  };

  if (previous) {
    snapshot.previousClose = previous.close;

    if (previous.close !== 0) {
      snapshot.changePercent = roundToTwo(
        ((latest.close - previous.close) / previous.close) * 100
      );
    }
  }

  return snapshot;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
