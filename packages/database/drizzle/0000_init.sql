CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "telegram_user_id" text NOT NULL,
  "preferred_delivery_chat_id" text,
  "preferred_delivery_chat_type" text,
  "display_name" text NOT NULL,
  "locale" text DEFAULT 'ko-KR' NOT NULL,
  "timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_telegram_user_id_unique" UNIQUE("telegram_user_id")
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_delivery_chat_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_delivery_chat_type" text;

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

CREATE TABLE IF NOT EXISTS "user_market_watch_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "item_code" text NOT NULL,
  "item_name" text,
  "asset_type" text,
  "source_key" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_custom" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_market_watch_items_user_item_code_unique" UNIQUE("user_id", "item_code")
);

CREATE TABLE IF NOT EXISTS "report_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "run_date" date NOT NULL,
  "schedule_type" text NOT NULL,
  "status" text NOT NULL,
  "report_text" text,
  "error_message" text,
  "prompt_version" text,
  "skill_version" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "report_runs_user_run_date_schedule_type_unique" UNIQUE("user_id", "run_date", "schedule_type")
);
