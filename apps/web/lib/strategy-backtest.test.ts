import { describe, expect, it } from "vitest";

import {
  evaluateOutcome,
  evaluateStrategySnapshots,
  resolveYahooSymbolCandidates,
  summarizeStrategySnapshots
} from "./strategy-backtest";

describe("strategy-backtest", () => {
  it("resolves Yahoo ticker candidates for KR symbols", () => {
    expect(
      resolveYahooSymbolCandidates({
        symbol: "005930",
        exchange: "KR"
      })
    ).toEqual(["005930.KS", "005930.KQ"]);
  });

  it("evaluates action outcomes with action-specific thresholds", () => {
    expect(evaluateOutcome("ACCUMULATE", 4.1)).toBe("win");
    expect(evaluateOutcome("REDUCE", 4.1)).toBe("loss");
    expect(evaluateOutcome("HOLD", 1.4)).toBe("win");
    expect(evaluateOutcome("DEFENSIVE", -2.4)).toBe("win");
  });

  it("builds realized returns from quote history and summarizes outcomes", async () => {
    const evaluated = await evaluateStrategySnapshots({
      snapshots: [
        {
          id: "snapshot-1",
          companyName: "삼성전자",
          exchange: "KR",
          symbol: "005930",
          runDate: "2026-03-20",
          totalScore: 0.42,
          action: "ACCUMULATE"
        },
        {
          id: "snapshot-2",
          companyName: "HMM",
          exchange: "KR",
          symbol: "011200",
          runDate: "2026-03-20",
          totalScore: -0.38,
          action: "REDUCE"
        }
      ],
      provider: {
        getDailyCloses: async ({ symbol }) => {
          if (symbol === "005930") {
            return [
              { date: "2026-03-20", close: 100 },
              { date: "2026-03-21", close: 105 }
            ];
          }

          return [
            { date: "2026-03-20", close: 100 },
            { date: "2026-03-21", close: 97 }
          ];
        }
      }
    });

    expect(evaluated).toMatchObject([
      {
        id: "snapshot-1",
        realizedReturnPct: 5,
        outcome: "win"
      },
      {
        id: "snapshot-2",
        realizedReturnPct: -3,
        outcome: "win"
      }
    ]);

    expect(summarizeStrategySnapshots(evaluated)).toEqual({
      averageReturnPct: 1,
      evaluatedCount: 2,
      hitRate: 100,
      lossCount: 0,
      neutralCount: 0,
      unavailableCount: 0,
      winCount: 2
    });
  });
});
