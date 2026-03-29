import OpenAI from "openai";

import {
  GOOGLE_PROVIDER_PROFILE,
  getLlmPolicy,
  OPENAI_PROVIDER_PROFILE,
  type LlmExecutionMode,
  type LlmPolicy,
  type LlmProvider,
  type LlmProviderProfile,
  type LlmTaskKind
} from "./llm-policy.js";

export type LlmGenerateRequest = {
  allowBackground?: boolean;
  input: string;
  instructions?: string;
  metadata?: Record<string, string>;
  task: LlmTaskKind;
  timeoutMs?: number;
};

export type LlmGenerateResponse = {
  executionMode: LlmExecutionMode;
  id?: string;
  model: string;
  outputText: string;
  provider: LlmProvider;
  status: "completed" | "in_progress";
};

export interface LlmClient {
  generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse>;
  retrieve?(responseId: string): Promise<LlmGenerateResponse>;
}

type OpenAiResponsesApi = {
  create(
    params: Record<string, unknown>
  ): Promise<{
    id?: string;
    output_text?: string;
    status?: string;
  }>;
  retrieve(
    responseId: string
  ): Promise<{
    id?: string;
    output_text?: string;
    status?: string;
  }>;
};

type GoogleGenerateContentApi = {
  generateContent(
    params: Record<string, unknown>,
    options?: {
      signal?: AbortSignal;
    }
  ): Promise<{
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
      finishReason?: string;
    }>;
  }>;
};

export class OpenAiLlmClient implements LlmClient {
  private readonly providerProfile: LlmProviderProfile;
  private readonly responsesApi: OpenAiResponsesApi;

  constructor(options?: {
    apiKey?: string;
    providerProfile?: LlmProviderProfile;
    responsesApi?: OpenAiResponsesApi;
  }) {
    this.providerProfile = options?.providerProfile ?? OPENAI_PROVIDER_PROFILE;

    if (this.providerProfile.provider !== "openai") {
      throw new Error("OpenAiLlmClient requires an OpenAI provider profile");
    }

    this.responsesApi =
      options?.responsesApi ??
      new OpenAI({
        apiKey: options?.apiKey
      }).responses;
  }

  async generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const policy = this.resolvePolicy(request);
    const response = await runWithTimeout(
      () => this.responsesApi.create(buildOpenAiCreateParams(request, policy)),
      request.timeoutMs
    );

    return mapOpenAiResponse(response, policy);
  }

  async retrieve(responseId: string): Promise<LlmGenerateResponse> {
    const response = await this.responsesApi.retrieve(responseId);
    const result: LlmGenerateResponse = {
      provider: this.providerProfile.provider,
      model: "",
      executionMode: "background",
      outputText: response.output_text ?? "",
      status: response.status === "completed" ? "completed" : "in_progress"
    };

    if (response.id) {
      result.id = response.id;
    }

    return result;
  }

  private resolvePolicy(request: LlmGenerateRequest): LlmPolicy {
    const options: {
      allowBackground?: boolean;
      providerProfile: LlmProviderProfile;
    } = {
      providerProfile: this.providerProfile
    };

    if (request.allowBackground !== undefined) {
      options.allowBackground = request.allowBackground;
    }

    return getLlmPolicy(request.task, options);
  }
}

export class GoogleGeminiLlmClient implements LlmClient {
  private readonly generateContentApi: GoogleGenerateContentApi;
  private readonly providerProfile: LlmProviderProfile;

  constructor(options?: {
    apiKey?: string;
    fetchFn?: typeof fetch;
    generateContentApi?: GoogleGenerateContentApi;
    providerProfile?: LlmProviderProfile;
  }) {
    this.providerProfile = options?.providerProfile ?? GOOGLE_PROVIDER_PROFILE;

    if (this.providerProfile.provider !== "google") {
      throw new Error("GoogleGeminiLlmClient requires a Google provider profile");
    }

    if (options?.generateContentApi) {
      this.generateContentApi = options.generateContentApi;
      return;
    }

    const googleOptions: {
      apiKey?: string;
      fetchFn?: typeof fetch;
    } = {};

    if (options?.apiKey !== undefined) {
      googleOptions.apiKey = options.apiKey;
    }

    if (options?.fetchFn !== undefined) {
      googleOptions.fetchFn = options.fetchFn;
    }

    this.generateContentApi = createGoogleGenerateContentApi(googleOptions);
  }

  async generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const policy = this.resolvePolicy(request);
    const abortController = request.timeoutMs
      ? new AbortController()
      : undefined;
    const response = await runWithTimeout(
      () =>
        this.generateContentApi.generateContent(
          buildGoogleGenerateContentParams(request, policy),
          abortController ? { signal: abortController.signal } : undefined
        ),
      request.timeoutMs,
      () => abortController?.abort()
    );

    return mapGoogleResponse(response, policy);
  }

  private resolvePolicy(request: LlmGenerateRequest): LlmPolicy {
    return getLlmPolicy(request.task, {
      allowBackground: false,
      providerProfile: this.providerProfile
    });
  }
}

export function createLlmClient(options?: {
  apiKey?: string;
  fetchFn?: typeof fetch;
  generateContentApi?: GoogleGenerateContentApi;
  providerProfile?: LlmProviderProfile;
  responsesApi?: OpenAiResponsesApi;
}): LlmClient {
  const providerProfile = options?.providerProfile ?? OPENAI_PROVIDER_PROFILE;

  switch (providerProfile.provider) {
    case "openai":
      return new OpenAiLlmClient(options);
    case "google":
      return new GoogleGeminiLlmClient(options);
    default:
      throw new Error(
        `No LLM adapter is implemented yet for provider: ${providerProfile.provider}`
      );
  }
}

function buildOpenAiCreateParams(
  request: LlmGenerateRequest,
  policy: LlmPolicy
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    model: policy.model,
    input: request.input
  };

  if (request.instructions) {
    params.instructions = request.instructions;
  }

  if (request.metadata && Object.keys(request.metadata).length > 0) {
    params.metadata = request.metadata;
  }

  if (policy.executionMode === "background") {
    params.background = true;
  }

  if (policy.storesResponse) {
    params.store = true;
  }

  return params;
}

function mapOpenAiResponse(
  response: { id?: string; output_text?: string; status?: string },
  policy: LlmPolicy
): LlmGenerateResponse {
  const result: LlmGenerateResponse = {
    provider: policy.provider,
    model: policy.model,
    executionMode: policy.executionMode,
    outputText: response.output_text ?? "",
    status: response.status === "completed" ? "completed" : "in_progress"
  };

  if (response.id) {
    result.id = response.id;
  }

  return result;
}

function createGoogleGenerateContentApi(input: {
  apiKey?: string;
  fetchFn?: typeof fetch;
}): GoogleGenerateContentApi {
  if (!input.apiKey) {
    throw new Error("GoogleGeminiLlmClient requires an API key");
  }

  const apiKey = input.apiKey;

  const fetchFn = input.fetchFn ?? globalThis.fetch;

  if (!fetchFn) {
    throw new Error("fetch is not available");
  }

  return {
    async generateContent(
      params: Record<string, unknown>,
      options?: {
        signal?: AbortSignal;
      }
    ) {
      const model = String(params.model);
      const payload = { ...params };
      delete payload.model;

      const response = await fetchFn(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: new Headers({
              "content-type": "application/json",
              "x-goog-api-key": apiKey
            }),
            body: JSON.stringify(payload),
            ...(options?.signal ? { signal: options.signal } : {})
          }
      );

      if (!response.ok) {
        throw new Error(`Gemini API request failed with status ${response.status}`);
      }

      return (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
          finishReason?: string;
        }>;
      };
    }
  };
}

function runWithTimeout<T>(
  execute: () => Promise<T>,
  timeoutMs?: number,
  onTimeout?: () => void
): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return execute();
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`LLM request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    void execute().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}


function buildGoogleGenerateContentParams(
  request: LlmGenerateRequest,
  policy: LlmPolicy
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    model: policy.model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: request.input
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: policy.requiresStructuredOutput
        ? "application/json"
        : "text/plain"
    }
  };

  if (request.instructions) {
    params.system_instruction = {
      parts: [
        {
          text: request.instructions
        }
      ]
    };
  }

  return params;
}

function mapGoogleResponse(
  response: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
      finishReason?: string;
    }>;
  },
  policy: LlmPolicy
): LlmGenerateResponse {
  const outputText =
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";

  return {
    provider: policy.provider,
    model: policy.model,
    executionMode: "synchronous",
    outputText,
    status: "completed"
  };
}
