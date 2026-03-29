import { describe, expect, it, vi } from "vitest";

import { NoopNewsCacheAdapter } from "./news-cache.js";
import { MacroTrendNewsService } from "./macro-trend-news-service.js";

describe("MacroTrendNewsService", () => {
  it("collects RSS articles and dedupes repeated URLs", async () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title><![CDATA[Fed signals cautious stance]]></title>
            <link>https://example.com/fed-1?utm_source=rss</link>
            <pubDate>Sat, 28 Mar 2026 07:00:00 GMT</pubDate>
            <description><![CDATA[Rate outlook remains cautious.]]></description>
          </item>
        </channel>
      </rss>
    `;
    const fetchImplementation = vi.fn(async () => new Response(xml, { status: 200 }));
    const service = new MacroTrendNewsService({
      cache: new NoopNewsCacheAdapter(),
      fetchImplementation
    });

    const items = await service.collect({
      audience: "public_web",
      runDate: "2026-03-28",
      scope: "macro",
      session: "weekend_briefing"
    });

    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({
      contentScope: "macro",
      newsSourceId: expect.any(String),
      title: "Fed signals cautious stance"
    });
  });

  it("groups collected items into macro trend briefs", async () => {
    const service = new MacroTrendNewsService({
      cache: new NoopNewsCacheAdapter(),
      fetchImplementation: vi.fn()
    });

    const briefs = await service.analyzeMacroTrends({
      audience: "public_web",
      runDate: "2026-03-28",
      session: "weekend_briefing",
      items: [
        {
          canonicalUrl: "https://example.com/fed-1",
          collectedAt: "2026-03-28T07:10:00.000Z",
          contentScope: "macro",
          newsSourceId: "reuters",
          newsSourceLabel: "Reuters",
          normalizedTitle: "fed signals cautious stance",
          publishedAt: "2026-03-28T07:00:00.000Z",
          region: "global",
          summary: "Fed and rates remain in focus.",
          title: "Fed signals cautious stance",
          url: "https://example.com/fed-1"
        },
        {
          canonicalUrl: "https://example.com/fed-2",
          collectedAt: "2026-03-28T07:20:00.000Z",
          contentScope: "macro",
          newsSourceId: "cnbc",
          newsSourceLabel: "CNBC",
          normalizedTitle: "bond yields rise on fed caution",
          publishedAt: "2026-03-28T07:05:00.000Z",
          region: "global",
          summary: "Bond yields rise as Fed caution persists.",
          title: "Bond yields rise on Fed caution",
          url: "https://example.com/fed-2"
        }
      ]
    });

    expect(briefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          theme: "fed_policy",
          confidence: "medium",
          references: expect.arrayContaining([
            expect.objectContaining({
              sourceLabel: "Reuters"
            })
          ])
        })
      ])
    );
  });
});
