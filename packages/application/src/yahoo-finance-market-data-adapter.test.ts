import { describe, expect, it, vi } from "vitest";

import { YahooFinanceScrapingMarketDataAdapter } from "./yahoo-finance-market-data-adapter.js";

describe("YahooFinanceScrapingMarketDataAdapter", () => {
  it("builds market data points from Yahoo Finance chart data", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          chart: {
            result: [
              {
                timestamp: [1773964800, 1774051200],
                indicators: {
                  quote: [
                    {
                      close: [6606.49, 6506.48]
                    }
                  ]
                }
              }
            ],
            error: null
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
    const adapter = new YahooFinanceScrapingMarketDataAdapter({
      fetchFn
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "SP500",
        itemName: "S&P 500",
        sourceKey: "index:SP:SPX"
      }
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "ok",
      data: {
        itemCode: "SP500",
        source: "yahoo_finance",
        previousValue: 6606.49,
        value: 6506.48,
        changePercent: -1.5138
      }
    });
  });

  it("deduplicates repeated timestamps from the same market date", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          chart: {
            result: [
              {
                timestamp: [1773927000, 1774013400, 1774040720],
                indicators: {
                  quote: [
                    {
                      close: [6606.49, 6506.48, 6506.48]
                    }
                  ]
                }
              }
            ],
            error: null
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
    const adapter = new YahooFinanceScrapingMarketDataAdapter({
      fetchFn
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "SP500",
        itemName: "S&P 500",
        sourceKey: "index:SP:SPX"
      }
    ]);

    expect(result).toMatchObject({
      status: "ok",
      data: {
        previousValue: 6606.49,
        value: 6506.48,
        changeValue: -100.01,
        changePercent: -1.5138
      }
    });
  });

  it("respects asOfDate when selecting the latest available market date", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          chart: {
            result: [
              {
                timestamp: [1773792000, 1773878400, 1773964800],
                indicators: {
                  quote: [
                    {
                      close: [6700, 6650, 6600]
                    }
                  ]
                }
              }
            ],
            error: null
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
    const adapter = new YahooFinanceScrapingMarketDataAdapter({ fetchFn });

    const [result] = await adapter.fetchMany([
      {
        asOfDate: "2026-03-19",
        itemCode: "SP500",
        itemName: "S&P 500",
        sourceKey: "index:SP:SPX"
      }
    ]);

    expect(result).toMatchObject({
      status: "ok",
      data: {
        asOfDate: "2026-03-19",
        previousValue: 6700,
        value: 6650,
        changePercent: -0.7463
      }
    });
  });

  it("marks unsupported source keys explicitly", async () => {
    const adapter = new YahooFinanceScrapingMarketDataAdapter({
      fetchFn: vi.fn()
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "US10Y",
        itemName: "미국 10년물 국채금리",
        sourceKey: "rate:US10Y"
      }
    ]);

    expect(result).toMatchObject({
      status: "error",
      errorCode: "unsupported_source",
      sourceKey: "rate:US10Y"
    });
  });

  it("maps provider failures without throwing", async () => {
    const adapter = new YahooFinanceScrapingMarketDataAdapter({
      fetchFn: vi.fn(async () => new Response("oops", { status: 429 }))
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "KOSPI",
        itemName: "코스피",
        sourceKey: "index:KRX:KOSPI"
      }
    ]);

    expect(result).toMatchObject({
      status: "error",
      errorCode: "provider_error",
      sourceKey: "index:KRX:KOSPI"
    });
  });
});
