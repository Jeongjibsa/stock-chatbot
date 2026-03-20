import OpenAI from "openai";

import {
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
    const response = await this.responsesApi.create(
      buildOpenAiCreateParams(request, policy)
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

export function createLlmClient(options?: {
  apiKey?: string;
  providerProfile?: LlmProviderProfile;
  responsesApi?: OpenAiResponsesApi;
}): LlmClient {
  const providerProfile = options?.providerProfile ?? OPENAI_PROVIDER_PROFILE;

  switch (providerProfile.provider) {
    case "openai":
      return new OpenAiLlmClient(options);
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
