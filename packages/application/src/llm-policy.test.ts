import { describe, expect, it } from "vitest";

import { getOpenAiLlmPolicy } from "./llm-policy.js";

describe("getOpenAiLlmPolicy", () => {
  it("routes extraction tasks to the cheapest structured model", () => {
    expect(getOpenAiLlmPolicy("news-event-extraction")).toMatchObject({
      api: "responses",
      model: "gpt-5-nano",
      executionMode: "synchronous",
      requiresStructuredOutput: true
    });
  });

  it("routes report composition to background mode only when allowed", () => {
    expect(
      getOpenAiLlmPolicy("market-report-composition")
    ).toMatchObject({
      model: "gpt-5-mini",
      executionMode: "synchronous",
      storesResponse: false
    });

    expect(
      getOpenAiLlmPolicy("market-report-composition", {
        allowBackground: true
      })
    ).toMatchObject({
      model: "gpt-5-mini",
      executionMode: "background",
      storesResponse: true
    });
  });

  it("routes fallback composition to the strongest fallback model", () => {
    expect(
      getOpenAiLlmPolicy("market-report-fallback", {
        allowBackground: true
      })
    ).toMatchObject({
      model: "gpt-5.1",
      executionMode: "background"
    });
  });
});
