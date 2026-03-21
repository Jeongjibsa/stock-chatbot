type HistoricalDailyClose = {
  close: number;
  date: string;
};

export type StrategyAction = "ACCUMULATE" | "DEFENSIVE" | "HOLD" | "REDUCE";

export type StrategyBacktestSnapshotInput = {
  action: StrategyAction;
  companyName: string;
  exchange: string | null;
  id: string;
  runDate: string;
  symbol: string | null;
  totalScore: number;
};

export type StrategyBacktestSnapshotResult = StrategyBacktestSnapshotInput & {
  outcome: "loss" | "neutral" | "unavailable" | "win";
  realizedReturnPct: number | null;
};

export type HistoricalQuoteProvider = {
  getDailyCloses(input: {
    exchange: string | null;
    runDate: string;
    symbol: string | null;
  }): Promise<HistoricalDailyClose[] | null>;
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

export async function evaluateStrategySnapshots<T extends StrategyBacktestSnapshotInput>(
  input: {
    provider?: HistoricalQuoteProvider;
    snapshots: T[];
  }
): Promise<Array<T & Pick<StrategyBacktestSnapshotResult, "outcome" | "realizedReturnPct">>> {
  const provider = input.provider ?? new YahooHistoricalQuoteProvider();

  return Promise.all(
    input.snapshots.map(async (snapshot) => {
      const closes = await provider.getDailyCloses({
        symbol: snapshot.symbol,
        exchange: snapshot.exchange,
        runDate: snapshot.runDate
      });

      if (!closes || closes.length === 0) {
        return {
          ...snapshot,
          realizedReturnPct: null,
          outcome: "unavailable"
        };
      }

      const entry = closes.find((close) => close.date >= snapshot.runDate) ?? closes[0];
      const latest = closes.at(-1);

      if (!entry || !latest || entry.close === 0) {
        return {
          ...snapshot,
          realizedReturnPct: null,
          outcome: "unavailable"
        };
      }

      const realizedReturnPct = roundToTwo(
        ((latest.close - entry.close) / entry.close) * 100
      );

      return {
        ...snapshot,
        realizedReturnPct,
        outcome: evaluateOutcome(snapshot.action, realizedReturnPct)
      };
    })
  );
}

export function summarizeStrategySnapshots(
  snapshots: StrategyBacktestSnapshotResult[]
): {
  averageReturnPct: number | null;
  evaluatedCount: number;
  hitRate: number | null;
  lossCount: number;
  neutralCount: number;
  unavailableCount: number;
  winCount: number;
} {
  const winCount = snapshots.filter((snapshot) => snapshot.outcome === "win").length;
  const lossCount = snapshots.filter((snapshot) => snapshot.outcome === "loss").length;
  const neutralCount = snapshots.filter((snapshot) => snapshot.outcome === "neutral").length;
  const unavailableCount = snapshots.filter(
    (snapshot) => snapshot.outcome === "unavailable"
  ).length;
  const evaluated = snapshots.filter(
    (snapshot) => snapshot.realizedReturnPct !== null
  );
  const decisiveCount = winCount + lossCount;
  const averageReturnPct =
    evaluated.length === 0
      ? null
      : roundToTwo(
          evaluated.reduce(
            (sum, snapshot) => sum + (snapshot.realizedReturnPct ?? 0),
            0
          ) / evaluated.length
        );

  return {
    winCount,
    lossCount,
    neutralCount,
    unavailableCount,
    evaluatedCount: evaluated.length,
    hitRate:
      decisiveCount === 0 ? null : roundToTwo((winCount / decisiveCount) * 100),
    averageReturnPct
  };
}

export function evaluateOutcome(
  action: StrategyAction,
  realizedReturnPct: number
): "loss" | "neutral" | "win" {
  switch (action) {
    case "ACCUMULATE":
      if (realizedReturnPct >= 2) {
        return "win";
      }

      if (realizedReturnPct <= -2) {
        return "loss";
      }

      return "neutral";
    case "REDUCE":
      if (realizedReturnPct <= -2) {
        return "win";
      }

      if (realizedReturnPct >= 2) {
        return "loss";
      }

      return "neutral";
    case "DEFENSIVE":
      if (realizedReturnPct <= -1) {
        return "win";
      }

      if (realizedReturnPct >= 3) {
        return "loss";
      }

      return "neutral";
    case "HOLD":
      if (realizedReturnPct >= -3 && realizedReturnPct <= 3) {
        return "win";
      }

      if (realizedReturnPct <= -6 || realizedReturnPct >= 6) {
        return "loss";
      }

      return "neutral";
  }
}

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

export class YahooHistoricalQuoteProvider implements HistoricalQuoteProvider {
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

  async getDailyCloses(input: {
    exchange: string | null;
    runDate: string;
    symbol: string | null;
  }): Promise<HistoricalDailyClose[] | null> {
    const candidates = resolveYahooSymbolCandidates(input);

    for (const candidate of candidates) {
      const closes = await this.fetchSingleSymbol(candidate);

      if (closes && closes.some((close) => close.date >= input.runDate)) {
        return closes;
      }
    }

    return null;
  }

  private async fetchSingleSymbol(symbol: string): Promise<HistoricalDailyClose[] | null> {
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
      return toHistoricalDailyCloses(body);
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

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
