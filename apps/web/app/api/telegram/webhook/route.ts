import { webhookCallback } from "grammy";

import {
  buildTelegramBotApp,
  TELEGRAM_ALLOWED_UPDATES
} from "@stock-chatbot/telegram-bot/build-bot";
import {
  createDatabase,
  createPool,
  TelegramProcessedUpdateRepository
} from "@stock-chatbot/database";
import {
  hasTelegramWebhookSecret,
  isAuthorizedTelegramWebhookRequest,
  isTelegramWebhookSecretRequired
} from "../../../../lib/telegram-webhook-auth";
import { extractTelegramUpdateId } from "../../../../lib/telegram-update";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

declare global {
  var __stockChatbotWebhookHandler:
    | ((request: Request) => Promise<Response>)
    | undefined;
  var __stockChatbotTelegramUpdateRepository:
    | TelegramProcessedUpdateRepository
    | undefined;
}

async function getWebhookHandler() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

  if (!globalThis.__stockChatbotWebhookHandler) {
    const app = buildTelegramBotApp(token, {
      ADMIN_DASHBOARD_PASSWORD: process.env.ADMIN_DASHBOARD_PASSWORD,
      ADMIN_DASHBOARD_USERNAME: process.env.ADMIN_DASHBOARD_USERNAME,
      CRON_SECRET: process.env.CRON_SECRET,
      DAILY_REPORT_WINDOW_MINUTES: process.env.DAILY_REPORT_WINDOW_MINUTES,
      DATABASE_URL: process.env.DATABASE_URL,
      FRED_API_KEY: process.env.FRED_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      PUBLIC_BRIEFING_BASE_URL: process.env.PUBLIC_BRIEFING_BASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      REPORT_TIMEZONE: process.env.REPORT_TIMEZONE,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_WEBHOOK_SECRET_TOKEN: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN
    });
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim();
    globalThis.__stockChatbotWebhookHandler = webhookSecret
      ? webhookCallback(app.bot, "std/http", {
          secretToken: webhookSecret
        })
      : webhookCallback(app.bot, "std/http");
  }

  return globalThis.__stockChatbotWebhookHandler as (request: Request) => Promise<Response>;
}

function getProcessedUpdateRepository() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return undefined;
  }

  if (!globalThis.__stockChatbotTelegramUpdateRepository) {
    const pool = createPool(databaseUrl);
    const db = createDatabase(pool);

    globalThis.__stockChatbotTelegramUpdateRepository =
      new TelegramProcessedUpdateRepository(db);
  }

  return globalThis.__stockChatbotTelegramUpdateRepository;
}

export async function GET() {
  return Response.json({
    ok: true,
    allowedUpdates: [...TELEGRAM_ALLOWED_UPDATES],
    mode: "webhook"
  });
}

export async function POST(request: Request) {
  if (
    isTelegramWebhookSecretRequired() &&
    !hasTelegramWebhookSecret()
  ) {
    console.warn("telegram-webhook-secret-missing", {
      required: true
    });
    return new Response("Webhook secret is not configured", {
      status: 500
    });
  }

  if (!isAuthorizedTelegramWebhookRequest(request)) {
    console.warn("telegram-webhook-unauthorized", {
      hasHeader: Boolean(
        request.headers.get("x-telegram-bot-api-secret-token")
      ),
      required: isTelegramWebhookSecretRequired(),
      secretConfigured: hasTelegramWebhookSecret()
    });
    return new Response("Unauthorized", {
      status: 401
    });
  }

  const body = await request.text();
  const updateId = extractTelegramUpdateId(body);
  const processedUpdateRepository = getProcessedUpdateRepository();

  if (updateId && processedUpdateRepository) {
    const created = await processedUpdateRepository.markProcessed(updateId);

    if (!created) {
      return new Response(null, {
        status: 200
      });
    }
  }

  const handler = await getWebhookHandler();
  return handler(
    new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body
    })
  );
}
