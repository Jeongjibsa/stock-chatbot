export { createDatabase, createPool, type DatabaseClient } from "./client.js";
export {
  DEFAULT_MARKET_WATCH_CATALOG,
  type DefaultMarketWatchCatalogItem
} from "./default-market-watch-catalog.js";
export { runMigrations } from "./migrate.js";
export {
  marketWatchCatalogItems,
  portfolioHoldings,
  users,
  type MarketWatchCatalogItemRecord,
  type NewMarketWatchCatalogItemRecord,
  type NewPortfolioHoldingRecord,
  type NewUserRecord,
  type PortfolioHoldingRecord,
  type UserRecord
} from "./schema.js";
export { MarketWatchCatalogRepository } from "./market-watch-catalog-repository.js";
export {
  PortfolioHoldingRepository,
  type UpsertPortfolioHoldingInput
} from "./portfolio-holding-repository.js";
export { UserRepository, type UpsertUserInput } from "./user-repository.js";
