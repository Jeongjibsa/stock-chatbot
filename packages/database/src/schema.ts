import {
  boolean,
  date,
  integer,
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
