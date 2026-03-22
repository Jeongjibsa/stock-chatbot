export { createDatabase, createPool, type DatabaseClient } from "./client.js";
export {
  DEFAULT_MARKET_WATCH_CATALOG,
  type DefaultMarketWatchCatalogItem
} from "./default-market-watch-catalog.js";
export { runMigrations } from "./migrate.js";
export {
  personalRebalancingSnapshots,
  marketWatchCatalogItems,
  portfolioHoldings,
  reports,
  reportRuns,
  strategySnapshots,
  tickerMasters,
  telegramConversationStates,
  telegramOutboundMessages,
  userMarketWatchItems,
  users,
  type MarketWatchCatalogItemRecord,
  type NewReportRunRecord,
  type NewReportRecord,
  type NewMarketWatchCatalogItemRecord,
  type NewPortfolioHoldingRecord,
  type NewPersonalRebalancingSnapshotRecord,
  type NewStrategySnapshotRecord,
  type NewTickerMasterRecord,
  type NewUserRecord,
  type NewUserMarketWatchItemRecord,
  type PortfolioHoldingRecord,
  type PersonalRebalancingSnapshotRecord,
  type ReportRecord,
  type ReportRunRecord,
  type StrategySnapshotRecord,
  type TickerMasterRecord,
  type TelegramConversationStateRecord,
  type TelegramOutboundMessageRecord,
  type UserMarketWatchItemRecord,
  type UserRecord
} from "./schema.js";
export { MarketWatchCatalogRepository } from "./market-watch-catalog-repository.js";
export {
  PortfolioHoldingRepository,
  type UpsertPortfolioHoldingInput
} from "./portfolio-holding-repository.js";
export {
  TickerMasterRepository,
  type SearchTickerCandidate,
  type UpsertTickerMasterInput
} from "./ticker-master-repository.js";
export {
  PersonalRebalancingSnapshotRepository,
  type UpsertPersonalRebalancingSnapshotInput
} from "./personal-rebalancing-snapshot-repository.js";
export {
  PublicReportRepository,
  type InsertPublicReportInput
} from "./public-report-repository.js";
export {
  StrategySnapshotRepository,
  type InsertStrategySnapshotInput
} from "./strategy-snapshot-repository.js";
export { TelegramConversationStateRepository } from "./telegram-conversation-state-repository.js";
export {
  ReportRunRepository,
  type CompleteReportRunInput,
  type ReportRunStatus,
  type StartReportRunInput
} from "./report-run-repository.js";
export { TelegramProcessedUpdateRepository } from "./telegram-processed-update-repository.js";
export { TelegramOutboundMessageRepository } from "./telegram-outbound-message-repository.js";
export {
  UserRepository,
  type UpdateUserReportSettingsInput,
  type UpsertUserInput
} from "./user-repository.js";
export {
  UserMarketWatchItemRepository,
  type AddCustomUserMarketWatchItemInput,
  type EffectiveUserMarketWatchItem
} from "./user-market-watch-item-repository.js";
