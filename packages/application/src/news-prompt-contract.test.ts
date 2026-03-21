import { describe, expect, it } from "vitest";

import {
  buildNewsEventExtractionPrompt,
  parseNewsEventExtractionOutput
} from "./news-prompt-contract.js";

describe("news prompt contract", () => {
  it("builds JSON prompt payload for news extraction", () => {
    const prompt = buildNewsEventExtractionPrompt({
      holding: {
        companyName: "Apple",
        exchange: "NASDAQ",
        symbol: "AAPL"
      },
      articles: [
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
      ]
    });

    expect(prompt.instructions).toContain("반드시 JSON 객체만 반환해");
    expect(prompt.metadata).toEqual({
      holdingSymbol: "AAPL",
      promptKind: "news-event-extraction"
    });
    expect(JSON.parse(prompt.input)).toEqual(
      expect.objectContaining({
        holding: expect.objectContaining({
          symbol: "AAPL"
        })
      })
    );
  });

  it("parses structured JSON output", () => {
    const output = parseNewsEventExtractionOutput(
      JSON.stringify({
        events: [
          {
            confidence: "high",
            eventType: "product",
            headline: "신제품 공개",
            sentiment: "positive",
            summary: "제품 공개가 수요 기대를 높였어.",
            supportingArticleIds: ["a1"]
          }
        ]
      })
    );

    expect(output).toEqual({
      events: [
        {
          confidence: "high",
          eventType: "product",
          headline: "신제품 공개",
          sentiment: "positive",
          summary: "제품 공개가 수요 기대를 높였어.",
          supportingArticleIds: ["a1"]
        }
      ]
    });
  });

  it("throws on malformed output", () => {
    expect(() => parseNewsEventExtractionOutput('{"items":[]}')).toThrow(
      "LLM news extraction output is missing events array"
    );
  });
});
