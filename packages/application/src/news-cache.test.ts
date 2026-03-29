import { describe, expect, it, vi } from "vitest";

import {
  UpstashNewsCacheAdapter,
  buildNewsDedupeKey,
  buildNewsFeedCacheKey,
  buildNewsMacroAnalysisKey
} from "./news-cache.js";

describe("news-cache", () => {
  it("builds stable cache keys", () => {
    expect(
      buildNewsDedupeKey({
        canonicalUrl: "https://example.com/a",
        normalizedTitle: "title",
        publishedDay: "2026-03-28"
      })
    ).toMatch(/^news:dedupe:/);
    expect(
      buildNewsFeedCacheKey({
        hourSlot: "2026-03-28:pre_market",
        session: "pre_market",
        sourceId: "reuters"
      })
    ).toBe("news:feed:reuters:pre_market:2026-03-28:pre_market");
    expect(
      buildNewsMacroAnalysisKey({
        runDate: "2026-03-28",
        session: "weekend_briefing"
      })
    ).toBe("news:macro-brief:weekend_briefing:2026-03-28");
  });

  it("uses Upstash REST pipeline for cache operations", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: "OK" }]), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: "cached-value" }]), { status: 200 })
      );
    const adapter = new UpstashNewsCacheAdapter({
      fetchImplementation,
      token: "token",
      url: "https://example.upstash.io"
    });

    await expect(adapter.reserveDedupeKey("news:dedupe:key", 60)).resolves.toBe(true);
    await expect(adapter.getCachedFeed("news:feed:key")).resolves.toBe("cached-value");
    expect(fetchImplementation).toHaveBeenNthCalledWith(
      1,
      "https://example.upstash.io/pipeline",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token"
        })
      })
    );
  });
});
