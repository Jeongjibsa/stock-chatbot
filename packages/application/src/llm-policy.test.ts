import { describe, expect, it } from "vitest";

import {
  createLlmProviderProfile,
  getLlmPolicy,
  OPENAI_PROVIDER_PROFILE
} from "./llm-policy.js";

describe("getLlmPolicy", () => {
  it("uses OpenAI as the default provider profile", () => {
    expect(getLlmPolicy("news-event-extraction")).toMatchObject({
      provider: "openai",
      apiStyle: "response-oriented",
      model: "gpt-5-nano",
      executionMode: "synchronous",
      structuredOutputMode: "native"
    });
  });

  it("routes report composition to background mode only when allowed", () => {
    expect(
      getLlmPolicy("market-report-composition", {
        providerProfile: OPENAI_PROVIDER_PROFILE
      })
    ).toMatchObject({
      model: "gpt-5-mini",
      executionMode: "synchronous",
      storesResponse: false
    });

    expect(
      getLlmPolicy("market-report-composition", {
        allowBackground: true,
        providerProfile: OPENAI_PROVIDER_PROFILE
      })
    ).toMatchObject({
      model: "gpt-5-mini",
      executionMode: "background",
      storesResponse: true
    });
  });

  it("supports provider switching through a custom profile", () => {
    const googleProfile = createLlmProviderProfile({
      provider: "google",
      apiStyle: "response-oriented",
      backgroundSupport: "none",
      reasoningSupport: true,
      structuredOutputMode: "adapter",
      models: {
        "news-event-extraction": "gemini-fast-extract",
        "news-summary": "gemini-balanced-summary",
        "risk-checkpoint-review": "gemini-balanced-summary",
        "market-report-composition": "gemini-balanced-summary",
        "market-report-fallback": "gemini-strong-fallback"
      }
    });

    expect(
      getLlmPolicy("news-summary", {
        providerProfile: googleProfile
      })
    ).toMatchObject({
      provider: "google",
      model: "gemini-balanced-summary",
      apiStyle: "response-oriented",
      structuredOutputMode: "adapter"
    });

    expect(
      getLlmPolicy("market-report-composition", {
        allowBackground: true,
        providerProfile: googleProfile
      })
    ).toMatchObject({
      provider: "google",
      executionMode: "synchronous",
      storesResponse: false
    });
  });
});
