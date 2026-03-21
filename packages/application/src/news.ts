export type HoldingReference = {
  companyName: string;
  exchange: string;
  symbol: string;
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

export interface NewsCollectionAdapter {
  fetchLatestForHolding(input: {
    holding: HoldingReference;
    limit?: number;
  }): Promise<NewsArticle[]>;
}
