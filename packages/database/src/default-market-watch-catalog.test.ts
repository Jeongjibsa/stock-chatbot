import { describe, expect, it } from "vitest";

import { DEFAULT_MARKET_WATCH_CATALOG } from "./default-market-watch-catalog.js";

describe("DEFAULT_MARKET_WATCH_CATALOG", () => {
  it("includes the major macro indicators required for the report", () => {
    expect(DEFAULT_MARKET_WATCH_CATALOG).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemCode: "KOSPI"
        }),
        expect.objectContaining({
          itemCode: "KOSDAQ"
        }),
        expect.objectContaining({
          itemCode: "SP500"
        }),
        expect.objectContaining({
          itemCode: "WTI"
        }),
        expect.objectContaining({
          itemCode: "HENRY_HUB_NATURAL_GAS"
        }),
        expect.objectContaining({
          itemCode: "COPPER"
        })
      ])
    );
  });
});
