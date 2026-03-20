export type LlmTaskKind =
  | "market-report-composition"
  | "market-report-fallback"
  | "news-event-extraction"
  | "news-summary"
  | "risk-checkpoint-review";

export type LlmExecutionMode = "background" | "synchronous";
export type LlmProvider = "anthropic" | "custom" | "google" | "openai";
export type LlmApiStyle = "message-oriented" | "response-oriented";
export type LlmStructuredOutputMode = "adapter" | "native";

export type LlmProviderProfile = {
  apiStyle: LlmApiStyle;
  backgroundSupport: "adapter" | "native" | "none";
  models: Record<LlmTaskKind, string>;
  provider: LlmProvider;
  reasoningSupport: boolean;
  structuredOutputMode: LlmStructuredOutputMode;
};

export type LlmPolicy = {
  apiStyle: LlmApiStyle;
  executionMode: LlmExecutionMode;
  model: string;
  provider: LlmProvider;
  reasoningEffort: "low" | "minimal" | "none";
  requiresStructuredOutput: boolean;
  storesResponse: boolean;
  structuredOutputMode: LlmStructuredOutputMode;
  task: LlmTaskKind;
};

export const OPENAI_PROVIDER_PROFILE: LlmProviderProfile = {
  provider: "openai",
  apiStyle: "response-oriented",
  backgroundSupport: "native",
  reasoningSupport: true,
  structuredOutputMode: "native",
  models: {
    "news-event-extraction": "gpt-5-nano",
    "news-summary": "gpt-5-mini",
    "risk-checkpoint-review": "gpt-5-mini",
    "market-report-composition": "gpt-5-mini",
    "market-report-fallback": "gpt-5.1"
  }
};

export function createLlmProviderProfile(
  profile: LlmProviderProfile
): LlmProviderProfile {
  return profile;
}

export function getLlmPolicy(
  task: LlmTaskKind,
  options?: {
    allowBackground?: boolean;
    providerProfile?: LlmProviderProfile;
  }
): LlmPolicy {
  const providerProfile = options?.providerProfile ?? OPENAI_PROVIDER_PROFILE;
  const allowBackground = options?.allowBackground ?? false;

  return {
    task,
    provider: providerProfile.provider,
    model: providerProfile.models[task],
    apiStyle: providerProfile.apiStyle,
    executionMode: resolveExecutionMode(providerProfile, allowBackground),
    reasoningEffort: resolveReasoningEffort(task, providerProfile),
    requiresStructuredOutput: true,
    storesResponse: shouldStoreResponse(providerProfile, allowBackground),
    structuredOutputMode: providerProfile.structuredOutputMode
  };
}

function resolveExecutionMode(
  providerProfile: LlmProviderProfile,
  allowBackground: boolean
): LlmExecutionMode {
  if (!allowBackground) {
    return "synchronous";
  }

  return providerProfile.backgroundSupport === "none"
    ? "synchronous"
    : "background";
}

function shouldStoreResponse(
  providerProfile: LlmProviderProfile,
  allowBackground: boolean
): boolean {
  return allowBackground && providerProfile.backgroundSupport !== "none";
}

function resolveReasoningEffort(
  task: LlmTaskKind,
  providerProfile: LlmProviderProfile
): "low" | "minimal" | "none" {
  if (!providerProfile.reasoningSupport) {
    return "none";
  }

  if (task === "news-event-extraction") {
    return "minimal";
  }

  return "low";
}
