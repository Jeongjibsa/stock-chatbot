import type { NewsSourceConfig } from "./news.js";

export const NEWS_SOURCE_CONFIGS: NewsSourceConfig[] = [
  {
    sourceId: "hankyung-finance",
    label: "한국경제",
    feedUrl: "https://www.hankyung.com/feed/finance",
    region: "kr",
    contentScope: "macro",
    primaryMode: "rss",
    fallbackMode: "jsoup_scrape",
    targetSessions: ["pre_market", "post_market", "weekend_briefing"],
    audience: ["public_web", "telegram_personalized"]
  },
  {
    sourceId: "mk-economy",
    label: "매일경제",
    feedUrl: "https://www.mk.co.kr/rss/30100041/",
    region: "kr",
    contentScope: "macro",
    primaryMode: "rss",
    fallbackMode: "naver_news_api",
    targetSessions: ["pre_market", "post_market", "weekend_briefing"],
    audience: ["public_web", "telegram_personalized"]
  },
  {
    sourceId: "einfomax",
    label: "연합인포맥스",
    feedUrl: "https://news.einfomax.co.kr/rss/S1N21.xml",
    region: "kr",
    contentScope: "macro",
    primaryMode: "rss",
    fallbackMode: "telegram_channel_parse",
    targetSessions: ["pre_market", "post_market", "weekend_briefing"],
    audience: ["public_web", "telegram_personalized"]
  },
  {
    sourceId: "edaily-stock",
    label: "이데일리",
    feedUrl: "https://www.edaily.co.kr/rss/stock.xml",
    region: "kr",
    contentScope: "macro",
    primaryMode: "rss",
    fallbackMode: "jsoup_scrape",
    targetSessions: ["pre_market", "post_market", "weekend_briefing"],
    audience: ["public_web", "telegram_personalized"]
  },
  {
    sourceId: "reuters-business",
    label: "Reuters",
    feedUrl: "https://www.reutersagency.com/feed/?best-topics=business",
    region: "global",
    contentScope: "macro",
    primaryMode: "rss",
    fallbackMode: "rapidapi_reuters",
    targetSessions: ["pre_market", "post_market", "weekend_briefing"],
    audience: ["public_web", "telegram_personalized"]
  },
  {
    sourceId: "cnbc-markets",
    label: "CNBC",
    feedUrl:
      "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000311",
    region: "global",
    contentScope: "macro",
    primaryMode: "rss",
    fallbackMode: "finnhub_api",
    targetSessions: ["pre_market", "post_market", "weekend_briefing"],
    audience: ["public_web", "telegram_personalized"]
  },
  {
    sourceId: "marketwatch-topstories",
    label: "MarketWatch",
    feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    region: "global",
    contentScope: "macro",
    primaryMode: "rss",
    fallbackMode: "jsoup_scrape",
    targetSessions: ["pre_market", "post_market", "weekend_briefing"],
    audience: ["public_web", "telegram_personalized"]
  },
  {
    sourceId: "yahoo-finance-news",
    label: "Yahoo Finance",
    feedUrl: "https://finance.yahoo.com/news/rssindex",
    region: "global",
    contentScope: "macro",
    primaryMode: "rss",
    fallbackMode: "yahoo_finance_api",
    targetSessions: ["pre_market", "post_market", "weekend_briefing"],
    audience: ["public_web", "telegram_personalized"]
  }
];

export function listNewsSources(input?: {
  audience?: "public_web" | "telegram_personalized";
  scope?: "holding" | "macro";
  session?: string;
}): NewsSourceConfig[] {
  return NEWS_SOURCE_CONFIGS.filter((source) => {
    if (input?.audience && !source.audience.includes(input.audience)) {
      return false;
    }

    if (input?.scope && source.contentScope !== input.scope) {
      return false;
    }

    if (input?.session && !source.targetSessions.includes(input.session)) {
      return false;
    }

    return true;
  });
}
