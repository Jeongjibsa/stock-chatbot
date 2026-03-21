import { describe, expect, it, vi } from "vitest";

import { PortfolioNewsBriefService } from "./portfolio-news-brief-service.js";

describe("PortfolioNewsBriefService", () => {
  it("fetches, dedupes and extracts events for holdings", async () => {
    const service = new PortfolioNewsBriefService({
      newsCollectionAdapter: {
        fetchLatestForHolding: vi.fn().mockResolvedValue([
          {
            companyName: "Apple",
            exchange: "NASDAQ",
            id: "a1",
            publishedAt: "2026-03-20T09:00:00.000Z",
            sourceName: "Example",
            symbol: "AAPL",
            title: "Apple launches new device",
            url: "https://example.com/news?id=1&utm_source=rss"
          },
          {
            companyName: "Apple",
            exchange: "NASDAQ",
            id: "a2",
            publishedAt: "2026-03-20T10:00:00.000Z",
            sourceName: "Example",
            symbol: "AAPL",
            title: "Apple launches new device",
            url: "https://example.com/news?id=1&utm_medium=social"
          }
        ])
      },
      llmClient: {
        generate: vi.fn().mockResolvedValue({
          executionMode: "synchronous",
          id: "resp_123",
          model: "gpt-5-nano",
          outputText: JSON.stringify({
            events: [
              {
                confidence: "medium",
                eventType: "product",
                headline: "신제품 공개",
                sentiment: "positive",
                summary: "신제품 공개가 관심을 끌고 있어.",
                supportingArticleIds: ["a1"]
              }
            ]
          }),
          provider: "openai",
          status: "completed"
        })
      }
    });

    const briefs = await service.generateBriefsForHoldings([
      {
        companyName: "Apple",
        exchange: "NASDAQ",
        symbol: "AAPL"
      }
    ]);

    expect(briefs).toEqual([
      expect.objectContaining({
        holding: expect.objectContaining({
          symbol: "AAPL"
        }),
        llmResponseId: "resp_123",
        status: "ok",
        articles: [
          expect.objectContaining({
            canonicalUrl: "https://example.com/news?id=1"
          })
        ],
        events: [
          expect.objectContaining({
            eventType: "product",
            sentiment: "positive"
          })
        ]
      })
    ]);
  });

  it("returns partial success when extraction fails", async () => {
    const service = new PortfolioNewsBriefService({
      newsCollectionAdapter: {
        fetchLatestForHolding: vi.fn().mockResolvedValue([
          {
            companyName: "Apple",
            exchange: "NASDAQ",
            id: "a1",
            publishedAt: "2026-03-20T09:00:00.000Z",
            sourceName: "Example",
            symbol: "AAPL",
            title: "Apple launches new device",
            url: "https://example.com/news/1"
          }
        ])
      },
      llmClient: {
        generate: vi.fn().mockResolvedValue({
          executionMode: "synchronous",
          model: "gpt-5-nano",
          outputText: '{"items":[]}',
          provider: "openai",
          status: "completed"
        })
      }
    });

    const [brief] = await service.generateBriefsForHoldings([
      {
        companyName: "Apple",
        exchange: "NASDAQ",
        symbol: "AAPL"
      }
    ]);

    if (!brief) {
      throw new Error("Expected a holding brief");
    }

    expect(brief.status).toBe("partial_success");
    expect(brief.errorMessage).toContain("events array");
  });
});
