export type LlmTaskKind =
  | "market-report-composition"
  | "market-report-fallback"
  | "news-event-extraction"
  | "news-summary"
  | "risk-checkpoint-review";

export type LlmExecutionMode = "background" | "synchronous";

export type OpenAiLlmPolicy = {
  api: "responses";
  executionMode: LlmExecutionMode;
  model: "gpt-5-mini" | "gpt-5-nano" | "gpt-5.1";
  reasoningEffort: "low" | "minimal" | "none";
  requiresStructuredOutput: boolean;
  storesResponse: boolean;
  task: LlmTaskKind;
};

export function getOpenAiLlmPolicy(
  task: LlmTaskKind,
  options?: {
    allowBackground?: boolean;
  }
): OpenAiLlmPolicy {
  const allowBackground = options?.allowBackground ?? false;

  switch (task) {
    case "news-event-extraction":
      return {
        task,
        api: "responses",
        model: "gpt-5-nano",
        executionMode: "synchronous",
        reasoningEffort: "minimal",
        requiresStructuredOutput: true,
        storesResponse: false
      };
    case "news-summary":
      return {
        task,
        api: "responses",
        model: "gpt-5-mini",
        executionMode: "synchronous",
        reasoningEffort: "low",
        requiresStructuredOutput: true,
        storesResponse: false
      };
    case "risk-checkpoint-review":
      return {
        task,
        api: "responses",
        model: "gpt-5-mini",
        executionMode: "synchronous",
        reasoningEffort: "low",
        requiresStructuredOutput: true,
        storesResponse: false
      };
    case "market-report-composition":
      return {
        task,
        api: "responses",
        model: "gpt-5-mini",
        executionMode: allowBackground ? "background" : "synchronous",
        reasoningEffort: "low",
        requiresStructuredOutput: true,
        storesResponse: allowBackground
      };
    case "market-report-fallback":
      return {
        task,
        api: "responses",
        model: "gpt-5.1",
        executionMode: allowBackground ? "background" : "synchronous",
        reasoningEffort: "low",
        requiresStructuredOutput: true,
        storesResponse: allowBackground
      };
  }
}
