import type { NewsArticle, NormalizedNewsArticle } from "./news.js";

const TRACKING_QUERY_PARAM_PREFIXES = ["ga_", "mc_", "utm_"];
const TRACKING_QUERY_PARAMS = new Set([
  "fbclid",
  "gclid",
  "ocid",
  "ref",
  "ref_src"
]);

export function normalizeNewsArticles(
  articles: NewsArticle[]
): NormalizedNewsArticle[] {
  return articles.map((article) => {
    const normalizedTitle = normalizeTitle(article.title);
    const canonicalUrl = canonicalizeUrl(article.url);
    const dedupeKey = buildDedupeKey(normalizedTitle, canonicalUrl, article.publishedAt);

    return {
      ...article,
      canonicalUrl,
      dedupeKey,
      normalizedTitle
    };
  });
}

export function dedupeNewsArticles(
  articles: NormalizedNewsArticle[]
): NormalizedNewsArticle[] {
  const deduped = new Map<string, NormalizedNewsArticle>();

  for (const article of articles) {
    const existing = deduped.get(article.dedupeKey);

    if (!existing || existing.publishedAt > article.publishedAt) {
      deduped.set(article.dedupeKey, article);
    }
  }

  return [...deduped.values()].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt)
  );
}

export function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    parsed.hash = "";

    const retainedParams = new URLSearchParams();

    for (const [key, value] of parsed.searchParams.entries()) {
      if (TRACKING_QUERY_PARAMS.has(key)) {
        continue;
      }

      if (TRACKING_QUERY_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        continue;
      }

      retainedParams.append(key, value);
    }

    parsed.search = retainedParams.toString();

    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim().toLowerCase();
}

function buildDedupeKey(
  normalizedTitle: string,
  canonicalUrl: string,
  publishedAt: string
): string {
  if (canonicalUrl) {
    return canonicalUrl;
  }

  return `${normalizedTitle}:${publishedAt.slice(0, 10)}`;
}
