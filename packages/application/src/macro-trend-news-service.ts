import {
  canonicalizeUrl,
  dedupeNewsArticles,
  normalizeNewsArticles
} from "./news-normalization.js";
import {
  buildNewsDedupeKey,
  buildNewsFeedCacheKey,
  buildNewsMacroAnalysisKey,
  DEFAULT_NEWS_ANALYSIS_TTL_SECONDS,
  DEFAULT_NEWS_DEDUPE_TTL_SECONDS,
  DEFAULT_NEWS_FEED_TTL_SECONDS,
  DEFAULT_NEWS_SOURCE_BACKOFF_TTL_SECONDS
} from "./news-cache.js";
import { listNewsSources } from "./news-source-config.js";
import type {
  CollectedNewsItem,
  MacroTrendBrief,
  NewsAudience,
  NewsCachePort,
  NewsCollector,
  NewsScope
} from "./news.js";

type FetchLike = typeof fetch;

export class MacroTrendNewsService implements NewsCollector {
  private readonly cache: NewsCachePort;
  private readonly fetchImplementation: FetchLike;

  constructor(input?: {
    cache?: NewsCachePort;
    fetchImplementation?: FetchLike;
  }) {
    this.cache = input?.cache ?? {
      getCachedAnalysis: async () => null,
      getCachedFeed: async () => null,
      reserveDedupeKey: async () => true,
      setCachedAnalysis: async () => {},
      setCachedFeed: async () => {}
    };
    this.fetchImplementation = input?.fetchImplementation ?? fetch;
  }

  async collect(input: {
    audience: NewsAudience;
    limitPerSource?: number;
    runDate: string;
    scope: NewsScope;
    session: string;
  }): Promise<CollectedNewsItem[]> {
    const hourSlot = `${input.runDate}:${input.session}`;
    const sources = listNewsSources({
      audience: input.audience,
      scope: input.scope,
      session: input.session
    });
    const collected: CollectedNewsItem[] = [];

    for (const source of sources) {
      if (await this.cache.sourceFailureActive?.(source.sourceId)) {
        continue;
      }

      const cacheKey = buildNewsFeedCacheKey({
        hourSlot,
        session: input.session,
        sourceId: source.sourceId
      });
      let feedItems: CollectedNewsItem[] | undefined;
      const cachedFeed = await this.cache.getCachedFeed(cacheKey);

      if (cachedFeed) {
        feedItems = safeParseCollectedItems(cachedFeed);
      }

      if (!feedItems) {
        try {
          feedItems = await fetchRssFeed({
            feedUrl: source.feedUrl,
            fetchImplementation: this.fetchImplementation,
            label: source.label,
            region: source.region,
            sourceId: source.sourceId,
            scope: source.contentScope,
            limit: input.limitPerSource ?? 6
          });
          await this.cache.setCachedFeed(
            cacheKey,
            JSON.stringify(feedItems),
            DEFAULT_NEWS_FEED_TTL_SECONDS
          );
        } catch (error) {
          await this.cache.markSourceFailure?.(
            source.sourceId,
            DEFAULT_NEWS_SOURCE_BACKOFF_TTL_SECONDS
          );
          console.warn(
            "[macro-trend-news] source fetch failed",
            source.sourceId,
            error instanceof Error ? error.message : error
          );
          continue;
        }
      }

      for (const item of feedItems) {
        const publishedDay = item.publishedAt.slice(0, 10);
        const dedupeKey = buildNewsDedupeKey({
          canonicalUrl: item.canonicalUrl,
          normalizedTitle: item.normalizedTitle,
          publishedDay
        });

        if (
          !(await this.cache.reserveDedupeKey(
            dedupeKey,
            DEFAULT_NEWS_DEDUPE_TTL_SECONDS
          ))
        ) {
          continue;
        }

        collected.push(item);
      }
    }

    const deduped = dedupeCollectedItems(collected);

    if (input.audience === "public_web" && input.scope === "macro") {
      return deduped.filter(isRelevantPublicMacroNewsItem);
    }

    return deduped;
  }

  async analyzeMacroTrends(input: {
    audience: NewsAudience;
    items: CollectedNewsItem[];
    runDate: string;
    session: string;
  }): Promise<MacroTrendBrief[]> {
    const cacheKey = buildNewsMacroAnalysisKey({
      runDate: input.runDate,
      session: input.session
    });
    const cached = await this.cache.getCachedAnalysis(cacheKey);

    if (cached) {
      const parsed = safeParseMacroTrendBriefs(cached);

      if (parsed.length > 0) {
        return parsed;
      }
    }

    const grouped = new Map<MacroTrendBrief["theme"], CollectedNewsItem[]>();

    for (const item of input.items) {
      const theme = classifyMacroTheme(item);
      const themedItems = grouped.get(theme) ?? [];
      themedItems.push(item);
      grouped.set(theme, themedItems);
    }

    const briefs = [...grouped.entries()]
      .map(([theme, items]) => {
        const references = items.slice(0, 3).map((item) => ({
          sourceLabel: item.newsSourceLabel,
          title: item.title,
          url: item.url
        }));
        const sourceIds = [...new Set(items.map((item) => item.newsSourceId))];
        const headlines = [...new Set(items.map((item) => item.title))].slice(0, 3);
        const summary = summarizeTheme(theme, items, input.audience);

        return {
          theme,
          summary,
          sourceIds,
          headlines,
          references,
          sentiment: inferSentiment(items),
          confidence: inferConfidence(items),
          publishedAt: items[0]?.publishedAt ?? input.runDate
        } satisfies MacroTrendBrief;
      })
      .filter((brief) => brief.references.length > 0)
      .sort((left, right) => right.references.length - left.references.length)
      .slice(0, 5);

    await this.cache.setCachedAnalysis(
      cacheKey,
      JSON.stringify(briefs),
      DEFAULT_NEWS_ANALYSIS_TTL_SECONDS
    );

    return briefs;
  }
}

function dedupeCollectedItems(items: CollectedNewsItem[]): CollectedNewsItem[] {
  const normalized = normalizeNewsArticles(
    items.map((item) => ({
      companyName: item.newsSourceLabel,
      exchange: item.region,
      id: `${item.publishedAt}:${item.url}`,
      publishedAt: item.publishedAt,
      sourceName: item.newsSourceLabel,
      ...(item.summary ? { summary: item.summary } : {}),
      symbol: item.newsSourceId,
      title: item.title,
      url: item.url
    }))
  );
  const deduped = dedupeNewsArticles(normalized);

  return deduped.map((item) => ({
    canonicalUrl: item.canonicalUrl,
    collectedAt: item.publishedAt,
    contentScope: "macro",
    newsSourceId: item.symbol,
    newsSourceLabel: item.sourceName,
    normalizedTitle: item.normalizedTitle,
    publishedAt: item.publishedAt,
    region: item.exchange === "kr" ? "kr" : "global",
    ...(item.summary ? { summary: item.summary } : {}),
    title: item.title,
    url: item.url
  }));
}

const STRONG_PERSONAL_FINANCE_KEYWORDS = [
  "medicaid",
  "medicare",
  "social security",
  "nursing home",
  "retirement",
  "retire",
  "daughter",
  "son",
  "wife",
  "husband",
  "mother",
  "father",
  "parents",
  "inheritance",
  "estate planning",
  "credit card",
  "mortgage",
  "student loan",
  "mobile home",
  "home insurance",
  "travel",
  "shopping",
  "coupon",
  "tax refund",
  "lottery",
  "divorce"
];

const MARKET_CONTEXT_KEYWORDS = [
  "market",
  "stocks",
  "shares",
  "equity",
  "index",
  "nasdaq",
  "s&p",
  "dow",
  "kospi",
  "kosdaq",
  "bond",
  "yield",
  "treasury",
  "fed",
  "fomc",
  "ecb",
  "boj",
  "rates",
  "rate cut",
  "rate hike",
  "inflation",
  "cpi",
  "ppi",
  "gdp",
  "payroll",
  "jobs report",
  "dollar",
  "usd",
  "fx",
  "won",
  "yen",
  "oil",
  "crude",
  "gas",
  "gold",
  "copper",
  "earnings",
  "guidance",
  "tariff",
  "trade",
  "semiconductor",
  "chip",
  "ai",
  "bank",
  "energy",
  "recession",
  "risk",
  "volatility",
  "선물",
  "증시",
  "주식",
  "지수",
  "금리",
  "환율",
  "달러",
  "국채",
  "연준",
  "물가",
  "고용",
  "유가",
  "반도체",
  "인공지능",
  "관세",
  "경기",
  "긴축",
  "완화"
];

function isRelevantPublicMacroNewsItem(item: CollectedNewsItem) {
  const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();

  if (hasKeyword(text, STRONG_PERSONAL_FINANCE_KEYWORDS)) {
    return false;
  }

  if (item.newsSourceId === "marketwatch-topstories") {
    return hasKeyword(text, MARKET_CONTEXT_KEYWORDS);
  }

  return true;
}

async function fetchRssFeed(input: {
  feedUrl: string;
  fetchImplementation: FetchLike;
  label: string;
  limit: number;
  region: "global" | "kr";
  scope: NewsScope;
  sourceId: string;
}): Promise<CollectedNewsItem[]> {
  const response = await input.fetchImplementation(input.feedUrl);

  if (!response.ok) {
    throw new Error(`RSS request failed with status ${response.status}`);
  }

  const xml = await response.text();
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  return itemBlocks.flatMap((itemBlock) => {
    const title = decodeHtmlEntities(extractTag(itemBlock, "title"));
    const url = decodeHtmlEntities(extractTag(itemBlock, "link"));
    const publishedAt = normalizeDate(extractTag(itemBlock, "pubDate"));
    const summary = decodeHtmlEntities(stripHtmlTags(extractTag(itemBlock, "description")));

    if (!title || !url || !publishedAt) {
      return [];
    }

    return [
      {
        canonicalUrl: canonicalizeUrl(url),
        collectedAt: new Date().toISOString(),
        contentScope: input.scope,
        newsSourceId: input.sourceId,
        newsSourceLabel: input.label,
        normalizedTitle: normalizeTitle(title),
        publishedAt,
        region: input.region,
        ...(summary ? { summary } : {}),
        title,
        url
      } satisfies CollectedNewsItem
    ];
  }).slice(0, input.limit);
}

function extractTag(block: string, tagName: string): string {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));

  if (!match?.[1]) {
    return "";
  }

  return stripCdata(match[1]).trim();
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function normalizeDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  return date.toISOString();
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function classifyMacroTheme(item: CollectedNewsItem): MacroTrendBrief["theme"] {
  const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();

  if (
    hasKeyword(text, ["fed", "fomc", "powell", "연준", "금리", "기준금리", "boj", "ecb"])
  ) {
    return "fed_policy";
  }

  if (hasKeyword(text, ["usd", "dollar", "환율", "원달러", "yen", "bond", "yield", "국채"])) {
    return "fx_rates";
  }

  if (
    hasKeyword(text, [
      "geopolitical",
      "war",
      "tariff",
      "supply chain",
      "중동",
      "관세",
      "공급망",
      "지정학"
    ])
  ) {
    return "global_risk";
  }

  if (hasKeyword(text, ["futures", "선물", "nasdaq futures", "s&p futures"])) {
    return "night_futures";
  }

  if (
    hasKeyword(text, [
      "semiconductor",
      "ai",
      "energy",
      "bank",
      "반도체",
      "2차전지",
      "바이오",
      "방산",
      "은행"
    ])
  ) {
    return "sector_rotation";
  }

  if (
    hasKeyword(text, [
      "policy",
      "government",
      "budget",
      "stimulus",
      "정책",
      "정부",
      "추경",
      "재정"
    ])
  ) {
    return "macro_policy";
  }

  return "market_theme";
}

function summarizeTheme(
  theme: MacroTrendBrief["theme"],
  items: CollectedNewsItem[],
  audience: NewsAudience
): string {
  const latest = items[0];
  const sourceCount = new Set(items.map((item) => item.newsSourceId)).size;
  const summaryPrefix =
    audience === "public_web"
      ? "공개 시장 해석 기준으로"
      : "개인화 브리핑 보조 기준으로";

  switch (theme) {
    case "fed_policy":
      return `${summaryPrefix} 금리와 중앙은행 발언 이슈가 다시 부각되고 있어 정책 기대와 긴축 부담을 함께 점검해야 합니다.`;
    case "fx_rates":
      return `${summaryPrefix} 달러, 환율, 채권금리 흐름이 변동성 방향을 좌우하고 있어 외환과 금리 민감도를 같이 봐야 합니다.`;
    case "global_risk":
      return `${summaryPrefix} 공급망과 지정학 리스크가 시장 전반 테마에 영향을 주고 있어 방어적 해석 비중을 높일 필요가 있습니다.`;
    case "night_futures":
      return `${summaryPrefix} 야간 선물과 미국 장외 흐름이 국내 개장 기대를 흔들고 있어 시초가 프레임 확인이 중요합니다.`;
    case "sector_rotation":
      return `${summaryPrefix} 섹터 로테이션 성격의 뉴스가 반복돼 강한 업종과 약한 업종을 나눠 보는 편이 적절합니다.`;
    case "macro_policy":
      return `${summaryPrefix} 거시 정책과 정부 발언이 시장 기대를 흔들고 있어 정책 방향성 재점검이 필요합니다.`;
    default:
      return latest?.summary
        ? `${summaryPrefix} ${latest.summary}`
        : `${summaryPrefix} 시장 전반 테마 뉴스가 ${sourceCount}개 소스에서 반복 확인됐습니다.`;
  }
}

function inferSentiment(items: CollectedNewsItem[]): MacroTrendBrief["sentiment"] {
  const text = items
    .map((item) => `${item.title} ${item.summary ?? ""}`.toLowerCase())
    .join(" ");

  const positiveScore = countKeywords(text, [
    "rebound",
    "gain",
    "rally",
    "optimism",
    "반등",
    "상승",
    "회복",
    "완화"
  ]);
  const negativeScore = countKeywords(text, [
    "selloff",
    "drop",
    "risk",
    "concern",
    "급락",
    "하락",
    "부담",
    "우려"
  ]);

  if (negativeScore > positiveScore) {
    return "negative";
  }

  if (positiveScore > negativeScore) {
    return "positive";
  }

  return "neutral";
}

function inferConfidence(items: CollectedNewsItem[]): MacroTrendBrief["confidence"] {
  const sourceCount = new Set(items.map((item) => item.newsSourceId)).size;

  if (sourceCount >= 3) {
    return "high";
  }

  if (sourceCount >= 2) {
    return "medium";
  }

  return "low";
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function countKeywords(text: string, keywords: string[]): number {
  return keywords.reduce(
    (count, keyword) => count + (text.includes(keyword) ? 1 : 0),
    0
  );
}

function safeParseCollectedItems(value: string): CollectedNewsItem[] | undefined {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as CollectedNewsItem[]) : undefined;
  } catch {
    return undefined;
  }
}

function safeParseMacroTrendBriefs(value: string): MacroTrendBrief[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as MacroTrendBrief[]) : [];
  } catch {
    return [];
  }
}
