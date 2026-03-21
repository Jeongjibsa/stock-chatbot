import { fileURLToPath } from "node:url";
import {
  buildMockTelegramReportPreview,
  TelegramBotApiClient,
  TelegramReportDeliveryAdapter
} from "@stock-chatbot/application";

import { loadTelegramBotEnv } from "./load-env.js";
import { readToken } from "./token.js";

loadTelegramBotEnv();

type Environment = Record<string, string | undefined>;

type TelegramIdentityPort = Pick<TelegramBotApiClient, "getMe">;
type TelegramDeliveryPort = Pick<TelegramReportDeliveryAdapter, "deliver">;

export function readSmokeTestChatId(env: Environment = process.env): string {
  const chatId = env.TELEGRAM_TEST_CHAT_ID;

  if (!chatId || chatId === "replace-me") {
    throw new Error("TELEGRAM_TEST_CHAT_ID is missing");
  }

  return chatId;
}

export function buildTelegramSmokeMessage(now: Date = new Date()): string {
  return [
    `🧪 Telegram smoke test | ${now.toISOString()}`,
    "",
    buildMockTelegramReportPreview().renderedText
  ].join("\n");
}

export async function runTelegramSmokeTest(
  dependencies: {
    deliveryAdapter: TelegramDeliveryPort;
    env?: Environment;
    now?: Date;
    telegramIdentityClient: TelegramIdentityPort;
  }
): Promise<{
  botLabel: string;
  deliveryId: string;
  recipientId: string;
}> {
  const env = dependencies.env ?? process.env;
  const recipientId = readSmokeTestChatId(env);
  const profile = await dependencies.telegramIdentityClient.getMe();
  const delivery = await dependencies.deliveryAdapter.deliver({
    channel: "telegram",
    recipientId,
    renderedText: buildTelegramSmokeMessage(dependencies.now)
  });

  return {
    botLabel: profile.username ? `@${profile.username}` : profile.firstName,
    deliveryId: delivery.deliveryId,
    recipientId
  };
}

async function main(env: Environment = process.env): Promise<void> {
  const token = readToken(env);

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

  const telegramClient = new TelegramBotApiClient({
    token
  });
  const result = await runTelegramSmokeTest({
    env,
    telegramIdentityClient: telegramClient,
    deliveryAdapter: new TelegramReportDeliveryAdapter({
      telegramClient
    })
  });

  console.log(
    [
      `[telegram-smoke] bot=${result.botLabel}`,
      `recipient=${result.recipientId}`,
      `deliveryId=${result.deliveryId}`
    ].join(" ")
  );
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
