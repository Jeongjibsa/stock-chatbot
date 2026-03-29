import type { NewsCachePort } from "./news.js";

type FetchLike = typeof fetch;

export const DEFAULT_NEWS_ANALYSIS_TTL_SECONDS = 24 * 60 * 60;
export const DEFAULT_NEWS_DEDUPE_TTL_SECONDS = 48 * 60 * 60;
export const DEFAULT_NEWS_FEED_TTL_SECONDS = 75 * 60;
export const DEFAULT_NEWS_SOURCE_BACKOFF_TTL_SECONDS = 15 * 60;

export class NoopNewsCacheAdapter implements NewsCachePort {
  async getCachedAnalysis(): Promise<string | null> {
    return null;
  }

  async getCachedFeed(): Promise<string | null> {
    return null;
  }

  async reserveDedupeKey(): Promise<boolean> {
    return true;
  }

  async setCachedAnalysis(): Promise<void> {}

  async setCachedFeed(): Promise<void> {}
}

export class UpstashNewsCacheAdapter implements NewsCachePort {
  private readonly fetchImplementation: FetchLike;
  private readonly token: string;
  private readonly url: string;

  constructor(input: {
    fetchImplementation?: FetchLike;
    token: string;
    url: string;
  }) {
    this.fetchImplementation = input.fetchImplementation ?? fetch;
    this.token = input.token;
    this.url = input.url.replace(/\/+$/, "");
  }

  async getCachedAnalysis(cacheKey: string): Promise<string | null> {
    return this.get(cacheKey);
  }

  async getCachedFeed(cacheKey: string): Promise<string | null> {
    return this.get(cacheKey);
  }

  async reserveDedupeKey(cacheKey: string, ttlSeconds: number): Promise<boolean> {
    const response = await this.command(["SET", cacheKey, "1", "EX", `${ttlSeconds}`, "NX"]);

    return response.result === "OK";
  }

  async setCachedAnalysis(
    cacheKey: string,
    value: string,
    ttlSeconds: number
  ): Promise<void> {
    await this.command(["SET", cacheKey, value, "EX", `${ttlSeconds}`]);
  }

  async setCachedFeed(
    cacheKey: string,
    value: string,
    ttlSeconds: number
  ): Promise<void> {
    await this.command(["SET", cacheKey, value, "EX", `${ttlSeconds}`]);
  }

  async markSourceFailure(sourceId: string, ttlSeconds: number): Promise<void> {
    await this.command([
      "SET",
      buildSourceFailureKey(sourceId),
      "1",
      "EX",
      `${ttlSeconds}`
    ]);
  }

  async sourceFailureActive(sourceId: string): Promise<boolean> {
    return (await this.get(buildSourceFailureKey(sourceId))) === "1";
  }

  private async get(cacheKey: string): Promise<string | null> {
    const response = await this.command(["GET", cacheKey]);

    return typeof response.result === "string" ? response.result : null;
  }

  private async command(command: string[]): Promise<{ result: unknown }> {
    const response = await this.fetchImplementation(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([command])
    });

    if (!response.ok) {
      throw new Error(`Upstash request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Array<{ result?: unknown }>;

    if (!payload[0]) {
      return { result: null };
    }

    return {
      result: payload[0].result ?? null
    };
  }
}

export function buildSourceFailureKey(sourceId: string): string {
  return `news:source-backoff:${sourceId}`;
}

export function buildNewsDedupeKey(input: {
  canonicalUrl: string;
  normalizedTitle: string;
  publishedDay: string;
}): string {
  return `news:dedupe:${stableHash(
    `${input.canonicalUrl}|${input.normalizedTitle}|${input.publishedDay}`
  )}`;
}

export function buildNewsFeedCacheKey(input: {
  hourSlot: string;
  session: string;
  sourceId: string;
}): string {
  return `news:feed:${input.sourceId}:${input.session}:${input.hourSlot}`;
}

export function buildNewsMacroAnalysisKey(input: {
  runDate: string;
  session: string;
}): string {
  return `news:macro-brief:${input.session}:${input.runDate}`;
}

export function buildNewsHoldingAnalysisKey(input: {
  runDate: string;
  session: string;
  symbol: string;
}): string {
  return `news:holding-brief:${input.symbol}:${input.runDate}:${input.session}`;
}

function stableHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0).toString(16);
}
