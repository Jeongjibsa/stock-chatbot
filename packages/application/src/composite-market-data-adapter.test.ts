import { describe, expect, it, vi } from "vitest";

import { CompositeMarketDataAdapter } from "./composite-market-data-adapter.js";

describe("CompositeMarketDataAdapter", () => {
  it("routes equity index requests to Yahoo Finance", async () => {
    const yahooFinanceAdapter = {
      fetchMany: vi.fn(async () => [
        {
          status: "ok" as const,
          data: {
            itemCode: "KOSPI",
            itemName: "코스피",
            source: "yahoo_finance" as const,
            sourceKey: "index:KRX:KOSPI",
            asOfDate: "2026-03-20",
            value: 5583.25
          }
        }
      ])
    };
    const fredAdapter = {
      fetchMany: vi.fn(async () => [])
    };
    const adapter = new CompositeMarketDataAdapter({
      yahooFinanceAdapter,
      fredAdapter
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "KOSPI",
        itemName: "코스피",
        sourceKey: "index:KRX:KOSPI"
      }
    ]);

    expect(yahooFinanceAdapter.fetchMany).toHaveBeenCalledTimes(1);
    expect(fredAdapter.fetchMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "ok",
      data: {
        source: "yahoo_finance"
      }
    });
  });

  it("falls back to FRED for supported macro series", async () => {
    const yahooFinanceAdapter = {
      fetchMany: vi.fn(async () => [])
    };
    const fredAdapter = {
      fetchMany: vi.fn(async () => [
        {
          status: "ok" as const,
          data: {
            itemCode: "US10Y",
            itemName: "미국 10년물 국채금리",
            source: "fred" as const,
            sourceKey: "rate:US10Y",
            asOfDate: "2026-03-19",
            value: 4.25
          }
        }
      ])
    };
    const adapter = new CompositeMarketDataAdapter({
      yahooFinanceAdapter,
      fredAdapter
    });

    const [result] = await adapter.fetchMany([
      {
        itemCode: "US10Y",
        itemName: "미국 10년물 국채금리",
        sourceKey: "rate:US10Y"
      }
    ]);

    expect(fredAdapter.fetchMany).toHaveBeenCalledTimes(1);
    expect(yahooFinanceAdapter.fetchMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "ok",
      data: {
        source: "fred"
      }
    });
  });
});
