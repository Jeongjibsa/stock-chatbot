export const REPORT_QUEUE_NAME = "daily-report";
export const DAILY_REPORT_JOB_NAME = "daily-report.run";

export type DailyReportPayload = {
  source: "bootstrap" | "scheduler" | "manual";
};

export {
  FredMarketDataAdapter
} from "./fred-market-data-adapter.js";
export {
  createLlmClient,
  OpenAiLlmClient,
  type LlmClient,
  type LlmGenerateRequest,
  type LlmGenerateResponse
} from "./llm-client.js";
export {
  createLlmProviderProfile,
  getLlmPolicy,
  OPENAI_PROVIDER_PROFILE,
  type LlmApiStyle,
  type LlmExecutionMode,
  type LlmPolicy,
  type LlmProvider,
  type LlmProviderProfile,
  type LlmStructuredOutputMode,
  type LlmTaskKind
} from "./llm-policy.js";
export {
  type MarketDataAdapter,
  type MarketDataFetchResult,
  type MarketDataItemRequest,
  type MarketDataPoint,
  type MarketDataSource
} from "./market-data.js";
export {
  StaticInstrumentResolver,
  type MarketIndicatorResolution,
  type PortfolioTickerResolution,
  type SupportedExchange
} from "./resolution.js";
