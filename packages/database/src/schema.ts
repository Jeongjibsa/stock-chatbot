import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  telegramUserId: text("telegram_user_id").notNull().unique(),
  preferredDeliveryChatId: text("preferred_delivery_chat_id"),
  preferredDeliveryChatType: text("preferred_delivery_chat_type"),
  displayName: text("display_name").notNull(),
  locale: text("locale").notNull().default("ko-KR"),
  timezone: text("timezone").notNull().default("Asia/Seoul"),
  dailyReportEnabled: boolean("daily_report_enabled").notNull().default(true),
  dailyReportHour: integer("daily_report_hour").notNull().default(9),
  dailyReportMinute: integer("daily_report_minute").notNull().default(0),
  reportDetailLevel: text("report_detail_level").notNull().default("standard"),
  includePublicBriefingLink: boolean("include_public_briefing_link")
    .notNull()
    .default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const portfolioHoldings = pgTable(
  "portfolio_holdings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    exchange: text("exchange").notNull(),
    companyName: text("company_name").notNull(),
    avgPrice: numeric("avg_price"),
    quantity: numeric("quantity"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userSymbolExchangeUnique: unique("portfolio_holdings_user_symbol_exchange_unique").on(
      table.userId,
      table.symbol,
      table.exchange
    )
  })
);

export const marketWatchCatalogItems = pgTable(
  "market_watch_catalog_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemCode: text("item_code").notNull(),
    itemName: text("item_name").notNull(),
    assetType: text("asset_type").notNull(),
    sourceKey: text("source_key").notNull(),
    isDefault: boolean("is_default").notNull().default(true),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    itemCodeUnique: unique("market_watch_catalog_items_item_code_unique").on(table.itemCode)
  })
);

export const userMarketWatchItems = pgTable(
  "user_market_watch_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemCode: text("item_code").notNull(),
    itemName: text("item_name"),
    assetType: text("asset_type"),
    sourceKey: text("source_key"),
    isActive: boolean("is_active").notNull().default(true),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userItemCodeUnique: unique("user_market_watch_items_user_item_code_unique").on(
      table.userId,
      table.itemCode
    )
  })
);

export const reportRuns = pgTable(
  "report_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    runDate: date("run_date").notNull(),
    scheduleType: text("schedule_type").notNull(),
    status: text("status").notNull(),
    reportText: text("report_text"),
    errorMessage: text("error_message"),
    promptVersion: text("prompt_version"),
    skillVersion: text("skill_version"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => ({
    userRunDateScheduleUnique: unique("report_runs_user_run_date_schedule_type_unique").on(
      table.userId,
      table.runDate,
      table.scheduleType
    )
  })
);

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportDate: date("report_date").notNull(),
  summary: text("summary").notNull(),
  marketRegime: text("market_regime").notNull(),
  totalScore: numeric("total_score").notNull(),
  signals: jsonb("signals").$type<string[]>().notNull(),
  contentMarkdown: text("content_markdown").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const strategySnapshots = pgTable("strategy_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportRunId: uuid("report_run_id")
    .notNull()
    .references(() => reportRuns.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  runDate: date("run_date").notNull(),
  scheduleType: text("schedule_type").notNull(),
  companyName: text("company_name").notNull(),
  exchange: text("exchange"),
  symbol: text("symbol"),
  action: text("action").notNull(),
  actionSummary: text("action_summary").notNull(),
  macroScore: numeric("macro_score").notNull(),
  trendScore: numeric("trend_score").notNull(),
  eventScore: numeric("event_score").notNull(),
  flowScore: numeric("flow_score").notNull(),
  totalScore: numeric("total_score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const telegramConversationStates = pgTable("telegram_conversation_states", {
  telegramUserId: text("telegram_user_id").primaryKey(),
  state: jsonb("state").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type PortfolioHoldingRecord = typeof portfolioHoldings.$inferSelect;
export type NewPortfolioHoldingRecord = typeof portfolioHoldings.$inferInsert;
export type MarketWatchCatalogItemRecord = typeof marketWatchCatalogItems.$inferSelect;
export type NewMarketWatchCatalogItemRecord = typeof marketWatchCatalogItems.$inferInsert;
export type UserMarketWatchItemRecord = typeof userMarketWatchItems.$inferSelect;
export type NewUserMarketWatchItemRecord = typeof userMarketWatchItems.$inferInsert;
export type ReportRunRecord = typeof reportRuns.$inferSelect;
export type NewReportRunRecord = typeof reportRuns.$inferInsert;
export type ReportRecord = typeof reports.$inferSelect;
export type NewReportRecord = typeof reports.$inferInsert;
export type StrategySnapshotRecord = typeof strategySnapshots.$inferSelect;
export type NewStrategySnapshotRecord = typeof strategySnapshots.$inferInsert;
export type TelegramConversationStateRecord =
  typeof telegramConversationStates.$inferSelect;
export type NewTelegramConversationStateRecord =
  typeof telegramConversationStates.$inferInsert;
