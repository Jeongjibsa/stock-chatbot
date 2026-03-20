import {
  boolean,
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
  displayName: text("display_name").notNull(),
  locale: text("locale").notNull().default("ko-KR"),
  timezone: text("timezone").notNull().default("Asia/Seoul"),
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

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type PortfolioHoldingRecord = typeof portfolioHoldings.$inferSelect;
export type NewPortfolioHoldingRecord = typeof portfolioHoldings.$inferInsert;
export type MarketWatchCatalogItemRecord = typeof marketWatchCatalogItems.$inferSelect;
export type NewMarketWatchCatalogItemRecord = typeof marketWatchCatalogItems.$inferInsert;
