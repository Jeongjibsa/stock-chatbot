export const REPORT_QUEUE_NAME = "daily-report";
export const DAILY_REPORT_JOB_NAME = "daily-report.run";

export type DailyReportPayload = {
  source: "bootstrap" | "scheduler" | "manual";
};

export {
  DailyReportCompositionService,
  type DailyReportComposition
} from "./daily-report-composition-service.js";
export {
  DailyReportOrchestrator,
  type DailyReportOrchestratorResult
} from "./daily-report-orchestrator.js";
export {
  CompositeMarketDataAdapter
} from "./composite-market-data-adapter.js";
export {
  FredMarketDataAdapter
} from "./fred-market-data-adapter.js";
export {
  buildHoldingNewsQuery,
  GoogleNewsRssAdapter
} from "./google-news-rss-adapter.js";
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
  YahooFinanceScrapingMarketDataAdapter
} from "./yahoo-finance-market-data-adapter.js";
export {
  dedupeNewsArticles,
  normalizeNewsArticles
} from "./news-normalization.js";
export {
  buildNewsEventExtractionPrompt,
  parseNewsEventExtractionOutput,
  type NewsEventExtractionOutput,
  type NewsEventExtractionPrompt
} from "./news-prompt-contract.js";
export {
  PortfolioNewsBriefService
} from "./portfolio-news-brief-service.js";
export {
  evaluateQuantSignals,
  type HoldingQuantSnapshot,
  type MarketRegime,
  type QuantSignal,
  type QuantSignalBias,
  type QuantSignalConfidence,
  type QuantSignalType
} from "./quant-signal-engine.js";
export {
  buildDailyReportPromptContract,
  parseDailyReportStructuredOutput,
  type DailyReportPromptInput,
  type DailyReportStructuredOutput
} from "./report-prompt-contract.js";
export {
  buildMockTelegramReportPreview,
  type MockReportPreview
} from "./mock-report-preview.js";
export {
  MockTelegramDeliveryAdapter,
  TelegramBotApiClient,
  TelegramReportDeliveryAdapter,
  type TelegramBotProfile,
  type TelegramSentMessage,
  type DeliveryChannel,
  type ReportDeliveryAdapter,
  type ReportDeliveryRequest,
  type ReportDeliveryResult
} from "./report-delivery.js";
export {
  toLatestReportView,
  toReportHistoryItem,
  type LatestReportView,
  type ReportHistoryItem
} from "./report-query-model.js";
export {
  DEFAULT_DAILY_REPORT_PROMPT_VERSION,
  DEFAULT_DAILY_REPORT_SKILL_VERSION
} from "./report-versioning.js";
export {
  generateRiskCheckpoints
} from "./risk-checkpoint-generator.js";
export {
  generateStrategyScenarios
} from "./strategy-scenario-generator.js";
export {
  type HoldingNewsBrief,
  type HoldingReference,
  type NewsArticle,
  type NewsCollectionAdapter,
  type NewsEvent,
  type NewsEventSentiment,
  type NormalizedNewsArticle
} from "./news.js";
export {
  renderTelegramDailyReport,
  type TelegramReportRenderInput
} from "./telegram-report-renderer.js";
export {
  StaticInstrumentResolver,
  type MarketIndicatorResolution,
  type PortfolioTickerResolution,
  type SupportedExchange
} from "./resolution.js";
