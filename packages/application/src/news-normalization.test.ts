import { describe, expect, it } from "vitest";

import {
  canonicalizeUrl,
  dedupeNewsArticles,
  normalizeNewsArticles
} from "./news-normalization.js";

describe("news normalization", () => {
  it("removes tracking params from article urls", () => {
    expect(
      canonicalizeUrl(
        "https://example.com/news?utm_source=rss&id=1&fbclid=abc&ref=home"
      )
    ).toBe("https://example.com/news?id=1");
  });

  it("normalizes and dedupes matching articles", () => {
    const normalized = normalizeNewsArticles([
      {
        companyName: "Apple",
        exchange: "NASDAQ",
        id: "1",
        publishedAt: "2026-03-20T09:00:00.000Z",
        sourceName: "Source A",
        symbol: "AAPL",
        title: " Apple launches new device ",
        url: "https://example.com/news?id=1&utm_source=rss"
      },
      {
        companyName: "Apple",
        exchange: "NASDAQ",
        id: "2",
        publishedAt: "2026-03-20T10:00:00.000Z",
        sourceName: "Source B",
        symbol: "AAPL",
        title: "Apple launches new device",
        url: "https://example.com/news?id=1&utm_medium=social"
      }
    ]);
    const deduped = dedupeNewsArticles(normalized);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]).toEqual(
      expect.objectContaining({
        canonicalUrl: "https://example.com/news?id=1",
        id: "1",
        normalizedTitle: "apple launches new device"
      })
    );
  });
});
