import { describe, expect, it, vi } from "vitest";

import {
  buildHoldingNewsQuery,
  GoogleNewsRssAdapter
} from "./google-news-rss-adapter.js";

describe("GoogleNewsRssAdapter", () => {
  it("builds holding specific queries", () => {
    expect(
      buildHoldingNewsQuery({
        companyName: "Apple",
        exchange: "NASDAQ",
        symbol: "AAPL"
      })
    ).toBe("Apple AAPL stock");
    expect(
      buildHoldingNewsQuery({
        companyName: "Samsung Electronics",
        exchange: "KRX",
        symbol: "005930"
      })
    ).toBe("Samsung Electronics 005930 한국 증시");
  });

  it("parses RSS items into news articles", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <rss>
          <channel>
            <item>
              <title><![CDATA[Apple launches new device]]></title>
              <link>https://example.com/news?id=1&amp;utm_source=rss</link>
              <pubDate>Thu, 20 Mar 2026 09:00:00 GMT</pubDate>
              <description><![CDATA[<p>Product update</p>]]></description>
              <source url="https://example.com">Example News</source>
            </item>
          </channel>
        </rss>`,
        {
          status: 200,
          headers: {
            "content-type": "application/xml"
          }
        }
      )
    );
    const adapter = new GoogleNewsRssAdapter({
      fetchImplementation
    });

    const articles = await adapter.fetchLatestForHolding({
      holding: {
        companyName: "Apple",
        exchange: "NASDAQ",
        symbol: "AAPL"
      },
      limit: 3
    });

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(articles).toEqual([
      expect.objectContaining({
        companyName: "Apple",
        exchange: "NASDAQ",
        sourceName: "Example News",
        sourceUrl: "https://example.com",
        summary: "Product update",
        symbol: "AAPL",
        title: "Apple launches new device",
        url: "https://example.com/news?id=1&utm_source=rss"
      })
    ]);
  });

  it("throws on upstream errors", async () => {
    const adapter = new GoogleNewsRssAdapter({
      fetchImplementation: vi.fn().mockResolvedValue(new Response("", { status: 500 }))
    });

    await expect(
      adapter.fetchLatestForHolding({
        holding: {
          companyName: "Apple",
          exchange: "NASDAQ",
          symbol: "AAPL"
        }
      })
    ).rejects.toThrow("Google News RSS request failed with status 500");
  });
});
