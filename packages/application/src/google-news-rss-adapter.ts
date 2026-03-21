import type { HoldingReference, NewsArticle, NewsCollectionAdapter } from "./news.js";

type FetchLike = typeof fetch;

export class GoogleNewsRssAdapter implements NewsCollectionAdapter {
  private readonly baseUrl: string;
  private readonly fetchImplementation: FetchLike;
  private readonly locale: string;
  private readonly region: string;

  constructor(options?: {
    baseUrl?: string;
    fetchImplementation?: FetchLike;
    locale?: string;
    region?: string;
  }) {
    this.baseUrl = options?.baseUrl ?? "https://news.google.com/rss/search";
    this.fetchImplementation = options?.fetchImplementation ?? fetch;
    this.locale = options?.locale ?? "ko";
    this.region = options?.region ?? "KR";
  }

  async fetchLatestForHolding(input: {
    holding: HoldingReference;
    limit?: number;
  }): Promise<NewsArticle[]> {
    const query = buildHoldingNewsQuery(input.holding);
    const url = new URL(this.baseUrl);

    url.searchParams.set("q", query);
    url.searchParams.set("hl", this.locale);
    url.searchParams.set("gl", this.region);
    url.searchParams.set("ceid", `${this.region}:${this.locale}`);

    const response = await this.fetchImplementation(url.toString());

    if (!response.ok) {
      throw new Error(`Google News RSS request failed with status ${response.status}`);
    }

    const xml = await response.text();
    const items = parseRssItems(xml, input.holding);

    return items.slice(0, input.limit ?? 5);
  }
}

export function buildHoldingNewsQuery(holding: HoldingReference): string {
  const tokens = [holding.companyName, holding.symbol];

  if (holding.exchange === "KRX") {
    tokens.push("한국 증시");
  }

  if (holding.exchange === "NASDAQ" || holding.exchange === "NYSE") {
    tokens.push("stock");
  }

  return tokens.filter(Boolean).join(" ");
}

function parseRssItems(xml: string, holding: HoldingReference): NewsArticle[] {
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  return itemBlocks.flatMap((itemBlock) => {
    const title = decodeHtmlEntities(extractTag(itemBlock, "title"));
    const url = decodeHtmlEntities(extractTag(itemBlock, "link"));
    const publishedAt = normalizeDate(extractTag(itemBlock, "pubDate"));
    const summary = extractTag(itemBlock, "description");
    const source = extractSource(itemBlock);

    if (!title || !url || !publishedAt || !source.name) {
      return [];
    }

    const article: NewsArticle = {
      id: buildArticleId(url, publishedAt),
      companyName: holding.companyName,
      exchange: holding.exchange,
      publishedAt,
      sourceName: decodeHtmlEntities(source.name),
      symbol: holding.symbol,
      title,
      url
    };

    if (source.url) {
      article.sourceUrl = source.url;
    }

    if (summary) {
      article.summary = decodeHtmlEntities(stripHtmlTags(summary));
    }

    return [article];
  });
}

function extractTag(block: string, tagName: string): string {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));

  if (!match?.[1]) {
    return "";
  }

  return stripCdata(match[1]).trim();
}

function extractSource(block: string): { name: string; url?: string } {
  const match = block.match(/<source(?:\s+url="([^"]+)")?>([\s\S]*?)<\/source>/i);

  if (!match?.[2]) {
    return { name: "" };
  }

  const source: { name: string; url?: string } = {
    name: stripCdata(match[2]).trim()
  };

  if (match[1]) {
    source.url = match[1];
  }

  return source;
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  return date.toISOString();
}

function buildArticleId(url: string, publishedAt: string): string {
  return `${publishedAt}:${url}`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
