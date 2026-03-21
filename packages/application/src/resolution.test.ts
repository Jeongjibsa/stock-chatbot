import { describe, expect, it } from "vitest";

import { StaticInstrumentResolver } from "./resolution.js";

describe("StaticInstrumentResolver", () => {
  const resolver = new StaticInstrumentResolver();

  it("resolves portfolio tickers by symbol and alias", () => {
    expect(resolver.resolvePortfolioTicker("AAPL")).toMatchObject({
      symbol: "AAPL",
      exchange: "US",
      matchedBy: "symbol"
    });

    expect(resolver.resolvePortfolioTicker("삼성전자")).toMatchObject({
      symbol: "005930",
      exchange: "KR",
      matchedBy: "alias"
    });
  });

  it("honors preferred exchange when resolving tickers", () => {
    expect(resolver.resolvePortfolioTicker("apple", "US")).toMatchObject({
      symbol: "AAPL",
      exchange: "US"
    });
    expect(resolver.resolvePortfolioTicker("apple", "KR")).toBeNull();
  });

  it("resolves market indicators from aliases and codes", () => {
    expect(resolver.resolveMarketIndicator("S&P 500")).toMatchObject({
      itemCode: "SP500",
      matchedBy: "itemCode"
    });

    expect(resolver.resolveMarketIndicator("공포지수")).toMatchObject({
      itemCode: "VIX",
      matchedBy: "alias"
    });

    expect(resolver.resolveMarketIndicator("usd/krw")).toMatchObject({
      itemCode: "USD_KRW",
      matchedBy: "itemCode"
    });

    expect(resolver.resolveMarketIndicator("달러인덱스")).toMatchObject({
      itemCode: "DXY",
      matchedBy: "alias"
    });
  });

  it("returns null for unsupported inputs", () => {
    expect(resolver.resolvePortfolioTicker("unknown ticker")).toBeNull();
    expect(resolver.resolveMarketIndicator("unsupported market")).toBeNull();
  });
});
