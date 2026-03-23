CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "telegram_user_id" text NOT NULL,
  "preferred_delivery_chat_id" text,
  "preferred_delivery_chat_type" text,
  "display_name" text NOT NULL,
  "locale" text DEFAULT 'ko-KR' NOT NULL,
  "timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
  "daily_report_enabled" boolean DEFAULT true NOT NULL,
  "daily_report_hour" integer DEFAULT 8 NOT NULL,
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
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "daily_report_hour" integer DEFAULT 8 NOT NULL;
ALTER TABLE "users" ALTER COLUMN "daily_report_hour" SET DEFAULT 8;
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

CREATE TABLE IF NOT EXISTS "ticker_masters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "symbol" text NOT NULL,
  "name_en" text DEFAULT '' NOT NULL,
  "name_kr" text DEFAULT '' NOT NULL,
  "market" text NOT NULL,
  "normalized_symbol" text NOT NULL,
  "normalized_name_en" text NOT NULL,
  "normalized_name_kr" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ticker_masters_symbol_market_unique" UNIQUE("symbol", "market")
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

CREATE TABLE IF NOT EXISTS "personal_rebalancing_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "requested_seoul_date" date NOT NULL,
  "effective_report_date" date NOT NULL,
  "kr_session_date" date,
  "us_session_date" date,
  "snapshot_version" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "personal_rebalancing_snapshots_user_effective_snapshot_unique"
    UNIQUE("user_id", "effective_report_date", "snapshot_version")
);

CREATE TABLE IF NOT EXISTS "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "report_date" date NOT NULL,
  "briefing_session" text DEFAULT 'pre_market' NOT NULL,
  "summary" text NOT NULL,
  "market_regime" text NOT NULL,
  "total_score" numeric NOT NULL,
  "signals" jsonb NOT NULL,
  "indicator_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "content_markdown" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reports_report_date_briefing_session_unique" UNIQUE("report_date", "briefing_session")
);

ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "indicator_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "briefing_session" text DEFAULT 'pre_market';
UPDATE "reports"
SET "briefing_session" = 'pre_market'
WHERE "briefing_session" IS NULL;
WITH "ranked_reports" AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "report_date", "briefing_session"
      ORDER BY "created_at" DESC, "id" DESC
    ) AS "rn"
  FROM "reports"
)
DELETE FROM "reports"
USING "ranked_reports"
WHERE "reports"."id" = "ranked_reports"."id"
  AND "ranked_reports"."rn" > 1;
ALTER TABLE "reports"
  ALTER COLUMN "briefing_session" SET DEFAULT 'pre_market';
ALTER TABLE "reports"
  ALTER COLUMN "briefing_session" SET NOT NULL;

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

CREATE TABLE IF NOT EXISTS "telegram_outbound_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" text NOT NULL,
  "method" text DEFAULT 'sendMessage' NOT NULL,
  "text" text NOT NULL,
  "telegram_message_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ticker_masters_normalized_symbol_idx"
  ON "ticker_masters" ("normalized_symbol");
CREATE INDEX IF NOT EXISTS "ticker_masters_normalized_name_en_idx"
  ON "ticker_masters" ("normalized_name_en");
CREATE INDEX IF NOT EXISTS "ticker_masters_normalized_name_kr_idx"
  ON "ticker_masters" ("normalized_name_kr");
CREATE INDEX IF NOT EXISTS "ticker_masters_normalized_name_en_trgm_idx"
  ON "ticker_masters" USING gin ("normalized_name_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ticker_masters_normalized_name_kr_trgm_idx"
  ON "ticker_masters" USING gin ("normalized_name_kr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ticker_masters_normalized_symbol_trgm_idx"
  ON "ticker_masters" USING gin ("normalized_symbol" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "telegram_outbound_messages_chat_id_created_at_idx"
  ON "telegram_outbound_messages" ("chat_id", "created_at");
CREATE INDEX IF NOT EXISTS "personal_rebalancing_snapshots_user_effective_date_idx"
  ON "personal_rebalancing_snapshots" ("user_id", "effective_report_date");
CREATE INDEX IF NOT EXISTS "personal_rebalancing_snapshots_effective_date_idx"
  ON "personal_rebalancing_snapshots" ("effective_report_date");
CREATE UNIQUE INDEX IF NOT EXISTS "reports_report_date_briefing_session_unique"
  ON "reports" ("report_date", "briefing_session");
CREATE INDEX IF NOT EXISTS "reports_report_date_session_created_at_idx"
  ON "reports" ("report_date", "briefing_session", "created_at");
