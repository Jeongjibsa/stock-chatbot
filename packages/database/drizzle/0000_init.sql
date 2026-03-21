CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "telegram_user_id" text NOT NULL,
  "preferred_delivery_chat_id" text,
  "preferred_delivery_chat_type" text,
  "display_name" text NOT NULL,
  "locale" text DEFAULT 'ko-KR' NOT NULL,
  "timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
  "daily_report_enabled" boolean DEFAULT true NOT NULL,
  "daily_report_hour" integer DEFAULT 9 NOT NULL,
  "daily_report_minute" integer DEFAULT 0 NOT NULL,
  "report_detail_level" text DEFAULT 'standard' NOT NULL,
  "include_public_briefing_link" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_telegram_user_id_unique" UNIQUE("telegram_user_id")
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_delivery_chat_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_delivery_chat_type" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "daily_report_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "daily_report_hour" integer DEFAULT 9 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "daily_report_minute" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "report_detail_level" text DEFAULT 'standard' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "include_public_briefing_link" boolean DEFAULT true NOT NULL;

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

CREATE TABLE IF NOT EXISTS "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "report_date" date NOT NULL,
  "summary" text NOT NULL,
  "market_regime" text NOT NULL,
  "total_score" numeric NOT NULL,
  "signals" jsonb NOT NULL,
  "content_markdown" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "strategy_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "report_run_id" uuid NOT NULL REFERENCES "report_runs"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "run_date" date NOT NULL,
  "schedule_type" text NOT NULL,
  "company_name" text NOT NULL,
  "exchange" text,
  "symbol" text,
  "action" text NOT NULL,
  "action_summary" text NOT NULL,
  "macro_score" numeric NOT NULL,
  "trend_score" numeric NOT NULL,
  "event_score" numeric NOT NULL,
  "flow_score" numeric NOT NULL,
  "total_score" numeric NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "telegram_conversation_states" (
  "telegram_user_id" text PRIMARY KEY NOT NULL,
  "state" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "telegram_processed_updates" (
  "update_id" text PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
