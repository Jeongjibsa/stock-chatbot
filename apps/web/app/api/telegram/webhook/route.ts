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
    const app = buildTelegramBotApp(token, process.env);
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
