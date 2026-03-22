import { describe, expect, it, vi } from "vitest";

import { FredMarketDataAdapter } from "./fred-market-data-adapter.js";

describe("FredMarketDataAdapter", () => {
  it("builds market data points from FRED observations", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          observations: [
            { date: "2026-03-20", value: "5800.1234" },
            { date: "2026-03-19", value: "5700.1234" },
            { date: "2026-03-18", value: "." }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );
    const adapter = new FredMarketDataAdapter({
      apiKey: "fred-key",
      fetchFn
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "NASDAQ",
        itemName: "나스닥 종합",
        sourceKey: "index:NASDAQ:IXIC"
      }
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "ok",
      data: {
        itemCode: "NASDAQ",
        source: "fred",
        previousValue: 5700.1234,
        value: 5800.1234,
        changeValue: 100,
        changePercent: 1.7543
      }
    });
  });

  it("marks unsupported source keys explicitly", async () => {
    const adapter = new FredMarketDataAdapter({
      apiKey: "fred-key",
      fetchFn: vi.fn()
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
      errorCode: "unsupported_source",
      sourceKey: "index:KRX:KOSPI"
    });
  });

  it("maps provider failures without throwing", async () => {
    const adapter = new FredMarketDataAdapter({
      apiKey: "fred-key",
      fetchFn: vi.fn(async () => new Response("oops", { status: 500 }))
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "VIX",
        itemName: "VIX",
        sourceKey: "index:CBOE:VIX"
      }
    ]);

    expect(result).toMatchObject({
      status: "error",
      errorCode: "provider_error",
      sourceKey: "index:CBOE:VIX"
    });
  });

  it("supports dollar index series", async () => {
    const adapter = new FredMarketDataAdapter({
      apiKey: "fred-key",
      fetchFn: vi.fn(async () =>
        new Response(
          JSON.stringify({
            observations: [
              { date: "2026-03-20", value: "121.50" },
              { date: "2026-03-19", value: "120.10" }
            ]
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        )
      )
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "DXY",
        itemName: "달러인덱스",
        sourceKey: "index:DXY"
      }
    ]);

    expect(result).toMatchObject({
      status: "ok",
      data: {
        itemCode: "DXY",
        previousValue: 120.1,
        value: 121.5
      }
    });
  });

  it("supports copper commodity series", async () => {
    const adapter = new FredMarketDataAdapter({
      apiKey: "fred-key",
      fetchFn: vi.fn(async () =>
        new Response(
          JSON.stringify({
            observations: [
              { date: "2026-01-01", value: "12986.60682" },
              { date: "2025-12-01", value: "11790.96409" }
            ]
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        )
      )
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "COPPER",
        itemName: "구리",
        sourceKey: "commodity:COPPER"
      }
    ]);

    expect(result).toMatchObject({
      status: "ok",
      data: {
        itemCode: "COPPER",
        previousValue: 11790.96409,
        value: 12986.60682
      }
    });
  });

  it("passes observation_end when asOfDate is provided", async () => {
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(typeof input === "string" ? input : input.toString());

      expect(url.searchParams.get("observation_end")).toBe("2026-03-17");

      return new Response(
        JSON.stringify({
          observations: [
            { date: "2026-03-17", value: "120.00" },
            { date: "2026-03-16", value: "119.50" }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });
    const adapter = new FredMarketDataAdapter({
      apiKey: "fred-key",
      fetchFn
    });

    const [result] = await adapter.fetchMany([
      {
        asOfDate: "2026-03-17",
        itemCode: "DXY",
        itemName: "달러인덱스",
        sourceKey: "index:DXY"
      }
    ]);

    expect(result).toMatchObject({
      status: "ok",
      data: {
        asOfDate: "2026-03-17",
        previousValue: 119.5,
        value: 120
      }
    });
  });
});
