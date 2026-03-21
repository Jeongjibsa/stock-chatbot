import type {
  PortfolioTickerResolution,
  SupportedExchange
} from "./resolution.js";

export type RankedTickerSearchMatchTier =
  | "exact_name"
  | "exact_symbol"
  | "fuzzy"
  | "partial"
  | "prefix";

export type RankedTickerSearchCandidate = {
  market: string;
  nameEn: string;
  nameKr: string;
  normalizedNameEn: string;
  normalizedNameKr: string;
  normalizedSymbol: string;
  similarityScore?: number;
  symbol: string;
};

export type RankedTickerSearchResult = {
  market: string;
  matchTier: RankedTickerSearchMatchTier;
  name: string;
  score: number;
  symbol: string;
};

type TickerSearchRepositoryPort = {
  count(): Promise<number>;
  findExactName(normalizedQuery: string, limit?: number): Promise<RankedTickerSearchCandidate[]>;
  findExactSymbol(
    normalizedQuery: string,
    limit?: number
  ): Promise<RankedTickerSearchCandidate[]>;
  findFuzzyMatches(
    normalizedQuery: string,
    limit?: number
  ): Promise<RankedTickerSearchCandidate[]>;
  findPartialMatches(
    normalizedQuery: string,
    limit?: number
  ): Promise<RankedTickerSearchCandidate[]>;
  findPrefixMatches(
    normalizedQuery: string,
    limit?: number
  ): Promise<RankedTickerSearchCandidate[]>;
};

type KnownTickerAliasResolver = {
  resolvePortfolioTicker(query: string): PortfolioTickerResolution | null;
};

const DEFAULT_LIMIT = 5;

export class RankedTickerSearchService {
  constructor(
    private readonly repository: TickerSearchRepositoryPort,
    private readonly options: {
      aliasResolver?: KnownTickerAliasResolver;
    } = {}
  ) {}

  async countTickers(): Promise<number> {
    return this.repository.count();
  }

  async search(query: string, limit = DEFAULT_LIMIT): Promise<RankedTickerSearchResult[]> {
    const normalizedQuery = normalizeTickerSearchInput(query);

    if (!normalizedQuery) {
      return [];
    }

    const resultsByKey = new Map<string, RankedTickerSearchResult>();
    const seededAliasResult = await this.resolveSeededAliasResult(query);

    if (seededAliasResult) {
      resultsByKey.set(
        buildTickerCandidateKey(seededAliasResult.symbol, seededAliasResult.market),
        seededAliasResult
      );
    }

    const stages: Array<{
      candidates: RankedTickerSearchCandidate[];
      tier: RankedTickerSearchMatchTier;
    }> = [
      {
        tier: "exact_symbol",
        candidates: await this.repository.findExactSymbol(normalizedQuery)
      },
      {
        tier: "exact_name",
        candidates: await this.repository.findExactName(normalizedQuery)
      },
      {
        tier: "prefix",
        candidates: await this.repository.findPrefixMatches(normalizedQuery)
      },
      {
        tier: "partial",
        candidates: await this.repository.findPartialMatches(normalizedQuery)
      },
      {
        tier: "fuzzy",
        candidates: await this.repository.findFuzzyMatches(normalizedQuery)
      }
    ];

    for (const stage of stages) {
      for (const candidate of stage.candidates) {
        const key = buildTickerCandidateKey(candidate.symbol, candidate.market);
        const score = scoreTickerCandidate(stage.tier, candidate, normalizedQuery);
        const existing = resultsByKey.get(key);

        if (existing && existing.score >= score) {
          continue;
        }

        resultsByKey.set(key, {
          symbol: candidate.symbol,
          name: selectTickerDisplayName(candidate),
          market: candidate.market,
          score,
          matchTier: stage.tier
        });
      }
    }

    return Array.from(resultsByKey.values())
      .sort(compareTickerSearchResult)
      .slice(0, limit);
  }

  pickHighConfidenceSingleResult(
    results: RankedTickerSearchResult[]
  ): RankedTickerSearchResult | null {
    const [first, second] = results;

    if (!first) {
      return null;
    }

    if (first.matchTier === "exact_symbol" || first.matchTier === "exact_name") {
      return first;
    }

    if (!second && first.score >= 820) {
      return first;
    }

    if (
      first.matchTier === "prefix" &&
      first.score >= 840 &&
      first.score - (second?.score ?? 0) >= 70
    ) {
      return first;
    }

    return null;
  }

  pickBulkAutoSelection(
    results: RankedTickerSearchResult[]
  ): RankedTickerSearchResult | null {
    const [first, second] = results;

    if (!first) {
      return null;
    }

    if (first.matchTier === "exact_symbol" || first.matchTier === "exact_name") {
      return first;
    }

    if (!second && first.score >= 850) {
      return first;
    }

    if (
      first.matchTier === "prefix" &&
      first.score >= 860 &&
      first.score - (second?.score ?? 0) >= 90
    ) {
      return first;
    }

    return null;
  }

  toPortfolioTickerResolution(
    result: RankedTickerSearchResult
  ): PortfolioTickerResolution {
    return {
      symbol: result.symbol,
      exchange: marketToSupportedExchange(result.market),
      companyName: result.name,
      matchedBy:
        result.matchTier === "exact_symbol" ? "symbol" : "alias",
      confidence:
        result.matchTier === "exact_symbol" || result.matchTier === "exact_name"
          ? "high"
          : "medium"
    };
  }

  private async resolveSeededAliasResult(
    query: string
  ): Promise<RankedTickerSearchResult | null> {
    const aliasResolution = this.options.aliasResolver?.resolvePortfolioTicker(query);

    if (!aliasResolution) {
      return null;
    }

    const exactSymbolMatches = await this.repository.findExactSymbol(
      normalizeTickerSearchInput(aliasResolution.symbol),
      5
    );
    const seeded = exactSymbolMatches.find(
      (candidate) =>
        marketToSupportedExchange(candidate.market) === aliasResolution.exchange
    );

    if (!seeded) {
      return null;
    }

    return {
      symbol: seeded.symbol,
      name: selectTickerDisplayName(seeded),
      market: seeded.market,
      score: 945,
      matchTier: "exact_name"
    };
  }
}

export function normalizeTickerSearchInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function normalizeTickerNameEn(value: string): string {
  return normalizeTickerSearchInput(stripEnglishCorporateSuffixes(value));
}

export function normalizeTickerNameKr(value: string): string {
  return normalizeTickerSearchInput(stripKoreanShareSuffixes(value));
}

export function formatTickerDisplayName(nameKr: string, nameEn: string): string {
  const strippedKr = stripKoreanShareSuffixes(nameKr).trim();

  if (strippedKr) {
    return strippedKr;
  }

  const trimmedEn = nameEn.trim();

  if (!trimmedEn) {
    return "";
  }

  return trimmedEn
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function selectTickerDisplayName(candidate: RankedTickerSearchCandidate): string {
  return formatTickerDisplayName(candidate.nameKr, candidate.nameEn);
}

function buildTickerCandidateKey(symbol: string, market: string): string {
  return `${market}:${symbol}`;
}

function compareTickerSearchResult(
  left: RankedTickerSearchResult,
  right: RankedTickerSearchResult
): number {
  return (
    right.score - left.score ||
    left.name.localeCompare(right.name, "ko-KR") ||
    left.symbol.localeCompare(right.symbol)
  );
}

function scoreTickerCandidate(
  tier: RankedTickerSearchMatchTier,
  candidate: RankedTickerSearchCandidate,
  normalizedQuery: string
): number {
  switch (tier) {
    case "exact_symbol":
      return 1000;
    case "exact_name":
      return 950;
    case "prefix": {
      const symbolPrefix = candidate.normalizedSymbol.startsWith(normalizedQuery);
      const base = symbolPrefix ? 900 : 840;
      const distance = Math.max(
        0,
        Math.min(
          40,
          Math.abs(
            Math.min(
              candidate.normalizedSymbol.length,
              candidate.normalizedNameKr.length || Number.MAX_SAFE_INTEGER,
              candidate.normalizedNameEn.length || Number.MAX_SAFE_INTEGER
            ) - normalizedQuery.length
          )
        )
      );

      return base - distance;
    }
    case "partial": {
      const symbolPartial = candidate.normalizedSymbol.includes(normalizedQuery);
      const base = symbolPartial ? 780 : 720;
      const penalty = Math.min(
        40,
        Math.max(
          0,
          Math.min(
            candidate.normalizedSymbol.indexOf(normalizedQuery),
            candidate.normalizedNameKr.indexOf(normalizedQuery) === -1
              ? Number.MAX_SAFE_INTEGER
              : candidate.normalizedNameKr.indexOf(normalizedQuery),
            candidate.normalizedNameEn.indexOf(normalizedQuery) === -1
              ? Number.MAX_SAFE_INTEGER
              : candidate.normalizedNameEn.indexOf(normalizedQuery)
          )
        )
      );

      return base - penalty;
    }
    case "fuzzy":
      return 560 + Math.round((candidate.similarityScore ?? 0) * 100);
  }
}

function stripEnglishCorporateSuffixes(value: string): string {
  return value
    .trim()
    .replace(
      /\b(incorporated|inc|corporation|corp|company|co|limited|ltd|holdings|holding|classa|classb|commonstock|ordinaryshares?)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function stripKoreanShareSuffixes(value: string): string {
  return value
    .trim()
    .replace(/(보통주식|보통주|보통|우선주|1우|2우|2우B|2우비|3우|3우B|3우비)$/u, "")
    .trim();
}

function marketToSupportedExchange(market: string): SupportedExchange {
  const normalizedMarket = market.trim().toUpperCase();

  if (normalizedMarket.startsWith("KOSPI") || normalizedMarket.startsWith("KOSDAQ")) {
    return "KR";
  }

  return "US";
}
