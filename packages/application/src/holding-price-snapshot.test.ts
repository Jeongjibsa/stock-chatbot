import { describe, expect, it, vi } from "vitest";

import {
  resolveYahooSymbolCandidates,
  YahooHoldingPriceSnapshotProvider
} from "./holding-price-snapshot.js";

describe("holding price snapshot", () => {
  it("resolves Korean symbols to KOSPI/KOSDAQ Yahoo candidates", () => {
    expect(
      resolveYahooSymbolCandidates({
        exchange: "KR",
        symbol: "005930"
      })
    ).toEqual(["005930.KS", "005930.KQ"]);
  });

  it("builds a holding snapshot from the latest closes up to runDate", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          chart: {
            result: [
              {
                timestamp: [
                  Date.parse("2026-03-19T00:00:00Z") / 1000,
                  Date.parse("2026-03-20T00:00:00Z") / 1000,
                  Date.parse("2026-03-21T00:00:00Z") / 1000
                ],
                indicators: {
                  quote: [
                    {
                      close: [184000, 182000, 181500]
                    }
                  ]
                }
              }
            ]
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );
    const provider = new YahooHoldingPriceSnapshotProvider({
      fetchFn
    });

    await expect(
      provider.getHoldingPriceSnapshot({
        exchange: "KR",
        runDate: "2026-03-20",
        symbol: "005930"
      })
    ).resolves.toEqual({
      asOfDate: "2026-03-20",
      currentPrice: 182000,
      previousClose: 184000,
      changePercent: -1.09
    });
  });
});
