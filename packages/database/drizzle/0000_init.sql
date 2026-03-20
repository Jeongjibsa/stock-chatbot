CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "telegram_user_id" text NOT NULL,
  "display_name" text NOT NULL,
  "locale" text DEFAULT 'ko-KR' NOT NULL,
  "timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_telegram_user_id_unique" UNIQUE("telegram_user_id")
);

CREATE TABLE IF NOT EXISTS "portfolio_holdings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "symbol" text NOT NULL,
  "exchange" text NOT NULL,
  "company_name" text NOT NULL,
  "avg_price" numeric,
  "quantity" numeric,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "portfolio_holdings_user_symbol_exchange_unique" UNIQUE("user_id", "symbol", "exchange")
);

CREATE TABLE IF NOT EXISTS "market_watch_catalog_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "item_code" text NOT NULL,
  "item_name" text NOT NULL,
  "asset_type" text NOT NULL,
  "source_key" text NOT NULL,
  "is_default" boolean DEFAULT true NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "market_watch_catalog_items_item_code_unique" UNIQUE("item_code")
);
