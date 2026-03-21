import { describe, expect, it } from "vitest";

import {
  formatTickerDisplayName,
  normalizeTickerNameEn,
  normalizeTickerNameKr,
  normalizeTickerSearchInput,
  RankedTickerSearchService
} from "./ticker-search.js";
import { StaticInstrumentResolver } from "./resolution.js";

describe("RankedTickerSearchService", () => {
  const repository = {
    count: async () => 3,
    findExactSymbol: async (query: string) =>
      query === "005930"
        ? [
            {
              symbol: "005930",
              market: "KOSPI",
              nameEn: "SamsungElectronics",
              nameKr: "삼성전자보통주",
              normalizedSymbol: "005930",
              normalizedNameEn: "samsungelectronics",
              normalizedNameKr: "삼성전자"
            }
          ]
        : query === "tsla"
          ? [
              {
                symbol: "TSLA",
                market: "NASDAQ",
                nameEn: "TeslaInc",
                nameKr: "",
                normalizedSymbol: "tsla",
                normalizedNameEn: "tesla",
                normalizedNameKr: ""
              }
            ]
          : [],
    findExactName: async (query: string) =>
      query === "삼성전자"
        ? [
            {
              symbol: "005930",
              market: "KOSPI",
              nameEn: "SamsungElectronics",
              nameKr: "삼성전자보통주",
              normalizedSymbol: "005930",
              normalizedNameEn: "samsungelectronics",
              normalizedNameKr: "삼성전자"
            }
          ]
        : [],
    findPrefixMatches: async (query: string) =>
      query === "samsung"
        ? [
            {
              symbol: "005930",
              market: "KOSPI",
              nameEn: "SamsungElectronics",
              nameKr: "삼성전자보통주",
              normalizedSymbol: "005930",
              normalizedNameEn: "samsungelectronics",
              normalizedNameKr: "삼성전자"
            },
            {
              symbol: "006400",
              market: "KOSPI",
              nameEn: "SamsungSDI",
              nameKr: "삼성SDI보통주",
              normalizedSymbol: "006400",
              normalizedNameEn: "samsungsdi",
              normalizedNameKr: "삼성sdi"
            }
          ]
        : [],
    findPartialMatches: async (query: string) =>
      query === "app"
        ? [
            {
              symbol: "AAPL",
              market: "NASDAQ",
              nameEn: "AppleInc",
              nameKr: "",
              normalizedSymbol: "aapl",
              normalizedNameEn: "apple",
              normalizedNameKr: ""
            }
          ]
        : [],
    findFuzzyMatches: async (query: string) =>
      query === "삼전"
        ? [
            {
              symbol: "005930",
              market: "KOSPI",
              nameEn: "SamsungElectronics",
              nameKr: "삼성전자보통주",
              normalizedSymbol: "005930",
              normalizedNameEn: "samsungelectronics",
              normalizedNameKr: "삼성전자",
              similarityScore: 0.39
            }
          ]
        : []
  };
  const service = new RankedTickerSearchService(repository, {
    aliasResolver: new StaticInstrumentResolver()
  });

  it("prioritizes exact symbol over all other match types", async () => {
    await expect(service.search("005930")).resolves.toMatchObject([
      {
        symbol: "005930",
        name: "삼성전자",
        matchTier: "exact_symbol",
        score: 1000
      }
    ]);
  });

  it("formats Korean display names without share suffixes", async () => {
    await expect(service.search("삼성전자")).resolves.toMatchObject([
      {
        symbol: "005930",
        name: "삼성전자",
        matchTier: "exact_name"
      }
    ]);
  });

  it("boosts curated aliases on top of database ranked search", async () => {
    await expect(service.search("삼전")).resolves.toMatchObject([
      {
        symbol: "005930",
        name: "삼성전자",
        matchTier: "exact_name"
      }
    ]);
  });

  it("keeps multiple prefix results ordered by score", async () => {
    const results = await service.search("samsung");

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.symbol).sort()).toEqual(["005930", "006400"]);
    expect(results[0]?.score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
    expect(service.pickHighConfidenceSingleResult(results)?.symbol).toBe("005930");
  });

  it("allows strict bulk auto-selection only for strong single candidates", async () => {
    const exact = await service.search("005930");
    const partial = await service.search("app");
    const fuzzy = await service.search("삼전");

    expect(service.pickBulkAutoSelection(exact)?.symbol).toBe("005930");
    expect(service.pickBulkAutoSelection(partial)).toBeNull();
    expect(service.pickBulkAutoSelection(fuzzy)?.symbol).toBe("005930");
  });

  it("normalizes names and formats English company names for display", () => {
    expect(normalizeTickerSearchInput(" Samsung Electronics ")).toBe(
      "samsungelectronics"
    );
    expect(normalizeTickerNameEn("Tesla, Inc.")).toBe("tesla");
    expect(normalizeTickerNameKr("삼성전자보통주")).toBe("삼성전자");
    expect(formatTickerDisplayName("", "SamsungElectronics")).toBe(
      "Samsung Electronics"
    );
  });
});
