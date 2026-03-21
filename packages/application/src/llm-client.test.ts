import { describe, expect, it, vi } from "vitest";

import {
  createLlmClient,
  GoogleGeminiLlmClient,
  OpenAiLlmClient,
  type LlmGenerateRequest
} from "./llm-client.js";
import {
  createLlmProviderProfile,
  GOOGLE_PROVIDER_PROFILE,
  OPENAI_PROVIDER_PROFILE
} from "./llm-policy.js";

describe("OpenAiLlmClient", () => {
  it("maps a synchronous response through the generic client interface", async () => {
    const create = vi.fn(async () => ({
      id: "resp_sync_1",
      output_text: "summary",
      status: "completed"
    }));
    const client = new OpenAiLlmClient({
      responsesApi: {
        create,
        retrieve: vi.fn()
      }
    });

    const response = await client.generate({
      task: "news-summary",
      input: "input text"
    });

    expect(create).toHaveBeenCalledWith({
      model: "gpt-5-mini",
      input: "input text"
    });
    expect(response).toMatchObject({
      provider: "openai",
      model: "gpt-5-mini",
      executionMode: "synchronous",
      outputText: "summary",
      status: "completed"
    });
  });

  it("sends background and store flags when policy requires them", async () => {
    const create = vi.fn(async () => ({
      id: "resp_bg_1",
      output_text: "",
      status: "in_progress"
    }));
    const client = new OpenAiLlmClient({
      responsesApi: {
        create,
        retrieve: vi.fn()
      }
    });

    const request: LlmGenerateRequest = {
      task: "market-report-composition",
      input: "compose report",
      instructions: "follow sections",
      allowBackground: true,
      metadata: {
        userId: "user-1"
      }
    };

    const response = await client.generate(request);

    expect(create).toHaveBeenCalledWith({
      model: "gpt-5-mini",
      input: "compose report",
      instructions: "follow sections",
      metadata: {
        userId: "user-1"
      },
      background: true,
      store: true
    });
    expect(response).toMatchObject({
      executionMode: "background",
      status: "in_progress"
    });
  });

  it("retrieves a stored background response", async () => {
    const client = new OpenAiLlmClient({
      responsesApi: {
        create: vi.fn(),
        retrieve: vi.fn(async () => ({
          id: "resp_bg_2",
          output_text: "done",
          status: "completed"
        }))
      }
    });

    await expect(client.retrieve("resp_bg_2")).resolves.toMatchObject({
      id: "resp_bg_2",
      executionMode: "background",
      outputText: "done",
      status: "completed"
    });
  });

  it("maps a Gemini generateContent response through the generic client interface", async () => {
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
    const client = new GoogleGeminiLlmClient({
      providerProfile: googleProfile,
      generateContentApi: {
        generateContent: vi.fn(async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "{\"ok\":true}" }]
              },
              finishReason: "STOP"
            }
          ]
        }))
      }
    });

    const response = await client.generate({
      task: "news-summary",
      input: "input text",
      instructions: "return JSON"
    });

    expect(response).toMatchObject({
      provider: "google",
      model: "gemini-balanced-summary",
      executionMode: "synchronous",
      outputText: "{\"ok\":true}",
      status: "completed"
    });
  });

  it("creates a Gemini client from the generic factory", () => {
    const client = createLlmClient({
      apiKey: "gemini-key",
      providerProfile: GOOGLE_PROVIDER_PROFILE,
      generateContentApi: {
        generateContent: vi.fn(async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "ok" }]
              }
            }
          ]
        }))
      }
    });

    expect(client).toBeInstanceOf(GoogleGeminiLlmClient);
  });

  it("creates an OpenAI client from the generic factory", () => {
    const client = createLlmClient({
      providerProfile: OPENAI_PROVIDER_PROFILE,
      responsesApi: {
        create: vi.fn(async () => ({
          id: "resp_sync_2",
          output_text: "",
          status: "completed"
        })),
        retrieve: vi.fn()
      }
    });

    expect(client).toBeInstanceOf(OpenAiLlmClient);
  });
});
