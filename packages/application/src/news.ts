export type HoldingReference = {
  companyName: string;
  exchange: string;
  symbol: string;
};

export type NewsAudience = "public_web" | "telegram_personalized";
export type NewsScope = "holding" | "macro";
export type NewsSourceRegion = "global" | "kr";
export type NewsSourcePrimaryMode = "rss";
export type NewsSourceFallbackMode =
  | "finnhub_api"
  | "jsoup_scrape"
  | "naver_news_api"
  | "rapidapi_reuters"
  | "telegram_channel_parse"
  | "yahoo_finance_api"
  | "none";

export type NewsSourceConfig = {
  audience: NewsAudience[];
  contentScope: NewsScope;
  fallbackMode: NewsSourceFallbackMode;
  feedUrl: string;
  label: string;
  primaryMode: NewsSourcePrimaryMode;
  region: NewsSourceRegion;
  sourceId: string;
  targetSessions: string[];
};

export type NewsArticle = {
  companyName: string;
  exchange: string;
  id: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl?: string;
  summary?: string;
  symbol: string;
  title: string;
  url: string;
};

export type CollectedNewsItem = {
  canonicalUrl: string;
  collectedAt: string;
  contentScope: NewsScope;
  newsSourceId: string;
  newsSourceLabel: string;
  normalizedTitle: string;
  publishedAt: string;
  region: NewsSourceRegion;
  summary?: string;
  title: string;
  url: string;
};

export type NormalizedNewsArticle = NewsArticle & {
  canonicalUrl: string;
  dedupeKey: string;
  normalizedTitle: string;
};

export type NewsEventSentiment = "negative" | "neutral" | "positive";

export type NewsEvent = {
  confidence: "high" | "low" | "medium";
  eventType:
    | "earnings"
    | "guidance"
    | "macro"
    | "merger"
    | "product"
    | "regulation"
    | "supply_chain"
    | "other";
  headline: string;
  sentiment: NewsEventSentiment;
  summary: string;
  supportingArticleIds: string[];
};

export type HoldingNewsBrief = {
  articles: NormalizedNewsArticle[];
  errorMessage?: string;
  events: NewsEvent[];
  holding: HoldingReference;
  llmResponseId?: string;
  status: "ok" | "partial_success" | "unavailable";
};

export type MacroTrendTheme =
  | "fed_policy"
  | "fx_rates"
  | "global_risk"
  | "macro_policy"
  | "market_theme"
  | "night_futures"
  | "sector_rotation";

export type MacroTrendBrief = {
  confidence: "high" | "low" | "medium";
  headlines: string[];
  publishedAt: string;
  references: Array<{
    sourceLabel: string;
    title: string;
    url: string;
  }>;
  sentiment: NewsEventSentiment;
  sourceIds: string[];
  summary: string;
  theme: MacroTrendTheme;
};

export interface NewsCollectionAdapter {
  fetchLatestForHolding(input: {
    holding: HoldingReference;
    limit?: number;
  }): Promise<NewsArticle[]>;
}

export interface NewsCollector {
  collect(input: {
    audience: NewsAudience;
    limitPerSource?: number;
    runDate: string;
    scope: NewsScope;
    session: string;
  }): Promise<CollectedNewsItem[]>;
}

export interface NewsCachePort {
  getCachedAnalysis(cacheKey: string): Promise<string | null>;
  getCachedFeed(cacheKey: string): Promise<string | null>;
  markSourceFailure?(sourceId: string, ttlSeconds: number): Promise<void>;
  reserveDedupeKey(cacheKey: string, ttlSeconds: number): Promise<boolean>;
  setCachedAnalysis(
    cacheKey: string,
    value: string,
    ttlSeconds: number
  ): Promise<void>;
  setCachedFeed(cacheKey: string, value: string, ttlSeconds: number): Promise<void>;
  sourceFailureActive?(sourceId: string): Promise<boolean>;
}
