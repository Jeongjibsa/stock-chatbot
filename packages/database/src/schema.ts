import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
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
  isRegistered: boolean("is_registered").notNull().default(true),
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockedReason: text("blocked_reason"),
  blockedAt: timestamp("blocked_at", { withTimezone: true }),
  unregisteredAt: timestamp("unregistered_at", { withTimezone: true }),
  locale: text("locale").notNull().default("ko-KR"),
  timezone: text("timezone").notNull().default("Asia/Seoul"),
  dailyReportEnabled: boolean("daily_report_enabled").notNull().default(true),
  dailyReportHour: integer("daily_report_hour").notNull().default(8),
  dailyReportMinute: integer("daily_report_minute").notNull().default(0),
  reportDetailLevel: text("report_detail_level").notNull().default("standard"),
  includePublicBriefingLink: boolean("include_public_briefing_link")
    .notNull()
    .default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const telegramRequestEvents = pgTable(
  "telegram_request_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    telegramUserId: text("telegram_user_id").notNull(),
    eventKind: text("event_kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    telegramUserIdCreatedAtIndex: index("telegram_request_events_user_created_at_idx").on(
      table.telegramUserId,
      table.createdAt
    ),
    telegramUserIdKindCreatedAtIndex: index(
      "telegram_request_events_user_kind_created_at_idx"
    ).on(table.telegramUserId, table.eventKind, table.createdAt)
  })
);

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

export const tickerMasters = pgTable(
  "ticker_masters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    symbol: text("symbol").notNull(),
    nameEn: text("name_en").notNull().default(""),
    nameKr: text("name_kr").notNull().default(""),
    market: text("market").notNull(),
    normalizedSymbol: text("normalized_symbol").notNull(),
    normalizedNameEn: text("normalized_name_en").notNull(),
    normalizedNameKr: text("normalized_name_kr").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    symbolMarketUnique: unique("ticker_masters_symbol_market_unique").on(
      table.symbol,
      table.market
    ),
    normalizedSymbolIndex: index("ticker_masters_normalized_symbol_idx").on(
      table.normalizedSymbol
    ),
    normalizedNameEnIndex: index("ticker_masters_normalized_name_en_idx").on(
      table.normalizedNameEn
    ),
    normalizedNameKrIndex: index("ticker_masters_normalized_name_kr_idx").on(
      table.normalizedNameKr
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

export const personalRebalancingSnapshots = pgTable(
  "personal_rebalancing_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestedSeoulDate: date("requested_seoul_date").notNull(),
    effectiveReportDate: date("effective_report_date").notNull(),
    krSessionDate: date("kr_session_date"),
    usSessionDate: date("us_session_date"),
    snapshotVersion: text("snapshot_version").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userEffectiveSnapshotUnique: unique(
      "personal_rebalancing_snapshots_user_effective_snapshot_unique"
    ).on(table.userId, table.effectiveReportDate, table.snapshotVersion),
    userEffectiveDateIndex: index(
      "personal_rebalancing_snapshots_user_effective_date_idx"
    ).on(table.userId, table.effectiveReportDate),
    effectiveDateIndex: index("personal_rebalancing_snapshots_effective_date_idx").on(
      table.effectiveReportDate
    )
  })
);

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportDate: date("report_date").notNull(),
  briefingSession: text("briefing_session").notNull().default("pre_market"),
  summary: text("summary").notNull(),
  marketRegime: text("market_regime").notNull(),
  totalScore: numeric("total_score").notNull(),
  signals: jsonb("signals").$type<string[]>().notNull(),
  indicatorTags: jsonb("indicator_tags").$type<string[]>().notNull(),
  newsReferences: jsonb("news_references")
    .$type<Array<{ sourceLabel: string; title: string; url: string }>>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  contentMarkdown: text("content_markdown").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
},
  (table) => ({
    reportDateSessionUnique: unique("reports_report_date_briefing_session_unique").on(
      table.reportDate,
      table.briefingSession
    ),
    reportDateSessionCreatedAtIndex: index("reports_report_date_session_created_at_idx").on(
      table.reportDate,
      table.briefingSession,
      table.createdAt
    )
  })
);

export const newsItems = pgTable(
  "news_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    newsSourceId: text("news_source_id").notNull(),
    newsSourceLabel: text("news_source_label").notNull(),
    contentScope: text("content_scope").notNull(),
    region: text("region").notNull(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    summary: text("summary"),
    symbol: text("symbol"),
    companyName: text("company_name"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    canonicalPublishedSourceUnique: unique(
      "news_items_canonical_published_source_unique"
    ).on(table.canonicalUrl, table.publishedAt, table.newsSourceId),
    sourcePublishedIndex: index("news_items_source_published_idx").on(
      table.newsSourceId,
      table.publishedAt
    ),
    scopePublishedIndex: index("news_items_scope_published_idx").on(
      table.contentScope,
      table.publishedAt
    )
  })
);

export const newsAnalysisResults = pgTable(
  "news_analysis_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runDate: date("run_date").notNull(),
    briefingSession: text("briefing_session").notNull(),
    audienceScope: text("audience_scope").notNull(),
    analysisType: text("analysis_type").notNull(),
    subjectKey: text("subject_key").notNull(),
    summary: text("summary").notNull(),
    sentiment: text("sentiment").notNull(),
    confidence: text("confidence").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    supportingNewsItemIds: jsonb("supporting_news_item_ids").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    runSessionAudienceSubjectUnique: unique(
      "news_analysis_results_run_session_audience_subject_unique"
    ).on(
      table.runDate,
      table.briefingSession,
      table.audienceScope,
      table.analysisType,
      table.subjectKey
    ),
    runDateSessionIndex: index("news_analysis_results_run_date_session_idx").on(
      table.runDate,
      table.briefingSession
    )
  })
);

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

export const telegramProcessedUpdates = pgTable("telegram_processed_updates", {
  updateId: text("update_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const telegramOutboundMessages = pgTable(
  "telegram_outbound_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: text("chat_id").notNull(),
    method: text("method").notNull().default("sendMessage"),
    text: text("text").notNull(),
    telegramMessageId: text("telegram_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    chatIdCreatedAtIndex: index("telegram_outbound_messages_chat_id_created_at_idx").on(
      table.chatId,
      table.createdAt
    )
  })
);

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type TelegramRequestEventRecord = typeof telegramRequestEvents.$inferSelect;
export type NewTelegramRequestEventRecord = typeof telegramRequestEvents.$inferInsert;
export type PortfolioHoldingRecord = typeof portfolioHoldings.$inferSelect;
export type NewPortfolioHoldingRecord = typeof portfolioHoldings.$inferInsert;
export type TickerMasterRecord = typeof tickerMasters.$inferSelect;
export type NewTickerMasterRecord = typeof tickerMasters.$inferInsert;
export type MarketWatchCatalogItemRecord = typeof marketWatchCatalogItems.$inferSelect;
export type NewMarketWatchCatalogItemRecord = typeof marketWatchCatalogItems.$inferInsert;
export type UserMarketWatchItemRecord = typeof userMarketWatchItems.$inferSelect;
export type NewUserMarketWatchItemRecord = typeof userMarketWatchItems.$inferInsert;
export type ReportRunRecord = typeof reportRuns.$inferSelect;
export type NewReportRunRecord = typeof reportRuns.$inferInsert;
export type PersonalRebalancingSnapshotRecord =
  typeof personalRebalancingSnapshots.$inferSelect;
export type NewPersonalRebalancingSnapshotRecord =
  typeof personalRebalancingSnapshots.$inferInsert;
export type ReportRecord = typeof reports.$inferSelect;
export type NewReportRecord = typeof reports.$inferInsert;
export type NewsItemRecord = typeof newsItems.$inferSelect;
export type NewNewsItemRecord = typeof newsItems.$inferInsert;
export type NewsAnalysisResultRecord = typeof newsAnalysisResults.$inferSelect;
export type NewNewsAnalysisResultRecord = typeof newsAnalysisResults.$inferInsert;
export type StrategySnapshotRecord = typeof strategySnapshots.$inferSelect;
export type NewStrategySnapshotRecord = typeof strategySnapshots.$inferInsert;
export type TelegramConversationStateRecord =
  typeof telegramConversationStates.$inferSelect;
export type NewTelegramConversationStateRecord =
  typeof telegramConversationStates.$inferInsert;
export type TelegramProcessedUpdateRecord =
  typeof telegramProcessedUpdates.$inferSelect;
export type NewTelegramProcessedUpdateRecord =
  typeof telegramProcessedUpdates.$inferInsert;
export type TelegramOutboundMessageRecord =
  typeof telegramOutboundMessages.$inferSelect;
export type NewTelegramOutboundMessageRecord =
  typeof telegramOutboundMessages.$inferInsert;
