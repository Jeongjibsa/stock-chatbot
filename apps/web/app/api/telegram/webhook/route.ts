import { webhookCallback } from "grammy";

import {
  buildTelegramBotApp,
  TELEGRAM_ALLOWED_UPDATES
} from "@stock-chatbot/telegram-bot/build-bot";
import { isAuthorizedTelegramWebhookRequest } from "../../../../lib/telegram-webhook-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

declare global {
  var __stockChatbotWebhookHandler:
    | ((request: Request) => Promise<Response>)
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
    globalThis.__stockChatbotWebhookHandler = webhookCallback(app.bot, "std/http");
  }

  return globalThis.__stockChatbotWebhookHandler as (request: Request) => Promise<Response>;
}

export async function GET() {
  return Response.json({
    ok: true,
    allowedUpdates: [...TELEGRAM_ALLOWED_UPDATES],
    mode: "webhook"
  });
}

export async function POST(request: Request) {
  if (!isAuthorizedTelegramWebhookRequest(request)) {
    return new Response("Unauthorized", {
      status: 401
    });
  }

  const handler = await getWebhookHandler();
  return handler(request);
}
