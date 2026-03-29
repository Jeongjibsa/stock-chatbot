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

  it("filters out public-web macro headlines that lack market relevance", async () => {
    const marketWatchXml = `
      <rss>
        <channel>
          <item>
            <title><![CDATA[My brother says lawyers can get him a Medicaid nursing home]]></title>
            <link>https://example.com/personal-finance</link>
            <pubDate>Sat, 28 Mar 2026 07:00:00 GMT</pubDate>
            <description><![CDATA[Family finance advice column.]]></description>
          </item>
          <item>
            <title><![CDATA[Nasdaq futures slip as bond yields rise before Fed speakers]]></title>
            <link>https://example.com/market-story</link>
            <pubDate>Sat, 28 Mar 2026 07:05:00 GMT</pubDate>
            <description><![CDATA[Bond yields and Fed remarks keep markets cautious.]]></description>
          </item>
        </channel>
      </rss>
    `;
    const yahooXml = `
      <rss>
        <channel>
          <item>
            <title><![CDATA[How can a surgeon struggle on a $665K salary? Ramit Sethi blames a certain financial mistake — here’s how to avoid it]]></title>
            <link>https://example.com/yahoo-advice</link>
            <pubDate>Sat, 28 Mar 2026 07:10:00 GMT</pubDate>
            <description><![CDATA[Personal finance advice story.]]></description>
          </item>
          <item>
            <title><![CDATA[Treasury yields rise as traders await Fed speakers]]></title>
            <link>https://example.com/yahoo-market</link>
            <pubDate>Sat, 28 Mar 2026 07:12:00 GMT</pubDate>
            <description><![CDATA[Markets remain focused on rates and the Fed.]]></description>
          </item>
        </channel>
      </rss>
    `;
    const hankyungXml = `
      <rss>
        <channel>
          <item>
            <title><![CDATA['은퇴 11년차' 70대, 예금 해지하더니…과감하게 뛰어든 곳]]></title>
            <link>https://example.com/hk-retire</link>
            <pubDate>Sat, 28 Mar 2026 07:20:00 GMT</pubDate>
            <description><![CDATA[생활형 재무 기사입니다.]]></description>
          </item>
          <item>
            <title><![CDATA[뉴욕·상하이 증시…美 3월 고용, 반등 규모에 관심]]></title>
            <link>https://example.com/hk-market</link>
            <pubDate>Sat, 28 Mar 2026 07:25:00 GMT</pubDate>
            <description><![CDATA[증시와 고용 지표가 함께 시장 방향을 좌우합니다.]]></description>
          </item>
        </channel>
      </rss>
    `;
    const mkXml = `
      <rss>
        <channel>
          <item>
            <title><![CDATA[[세종 인사이드] "어려운 암호화자산 규정, AI 챗봇이 쉽게 설명해주죠"]]></title>
            <link>https://example.com/mk-column</link>
            <pubDate>Sat, 28 Mar 2026 07:30:00 GMT</pubDate>
            <description><![CDATA[서비스형 설명 기사입니다.]]></description>
          </item>
          <item>
            <title><![CDATA[원·달러 환율과 국채 금리 동반 상승…증시 변동성 확대]]></title>
            <link>https://example.com/mk-market</link>
            <pubDate>Sat, 28 Mar 2026 07:35:00 GMT</pubDate>
            <description><![CDATA[환율과 금리 흐름이 시장 변동성을 키웁니다.]]></description>
          </item>
        </channel>
      </rss>
    `;
    const emptyXml = "<rss><channel></channel></rss>";
    const fetchImplementation = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("mw_topstories")) {
        return new Response(marketWatchXml, { status: 200 });
      }

      if (url.includes("rssindex")) {
        return new Response(yahooXml, { status: 200 });
      }

      if (url.includes("hankyung.com/feed/finance")) {
        return new Response(hankyungXml, { status: 200 });
      }

      if (url.includes("mk.co.kr/rss/30100041")) {
        return new Response(mkXml, { status: 200 });
      }

      return new Response(emptyXml, { status: 200 });
    });
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

    expect(items.map((item) => item.title).sort()).toEqual([
      "Nasdaq futures slip as bond yields rise before Fed speakers",
      "Treasury yields rise as traders await Fed speakers",
      "원·달러 환율과 국채 금리 동반 상승…증시 변동성 확대",
      "뉴욕·상하이 증시…美 3월 고용, 반등 규모에 관심"
    ].sort());
    expect(items.map((item) => item.title)).not.toContain(
      "How can a surgeon struggle on a $665K salary? Ramit Sethi blames a certain financial mistake — here’s how to avoid it"
    );
    expect(items.map((item) => item.title)).not.toContain(
      "'은퇴 11년차' 70대, 예금 해지하더니…과감하게 뛰어든 곳"
    );
    expect(items.map((item) => item.title)).not.toContain(
      "[세종 인사이드] \"어려운 암호화자산 규정, AI 챗봇이 쉽게 설명해주죠\""
    );
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
