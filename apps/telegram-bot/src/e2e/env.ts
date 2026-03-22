import { loadTelegramBotEnv } from "../load-env.js";
import { readToken } from "../token.js";

loadTelegramBotEnv();

type Environment = Record<string, string | undefined>;

export type TelegramE2EConfig = {
  allowProduction: boolean;
  cleanupAfterRun: boolean;
  databaseUrl: string;
  groupChatId?: string | undefined;
  pollIntervalMs: number;
  primaryChatId: string;
  primaryUserId: string;
  secondaryChatId?: string | undefined;
  secondaryUserId?: string | undefined;
  timeoutMs: number;
  token: string;
  webhookSecretToken: string;
  webhookUrl: string;
};

export function readTelegramE2EConfig(
  env: Environment = process.env
): TelegramE2EConfig {
  const token = readToken(env);

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

  const webhookUrl =
    env.TELEGRAM_E2E_WEBHOOK_URL?.trim() ??
    env.TELEGRAM_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    throw new Error("TELEGRAM_WEBHOOK_URL is missing");
  }

  const webhookSecretToken = env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim();

  if (!webhookSecretToken) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET_TOKEN is missing");
  }

  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  const primaryChatId =
    env.TELEGRAM_E2E_PRIMARY_CHAT_ID?.trim() ??
    env.TELEGRAM_TEST_CHAT_ID?.trim();

  if (!primaryChatId) {
    throw new Error(
      "TELEGRAM_E2E_PRIMARY_CHAT_ID or TELEGRAM_TEST_CHAT_ID is missing"
    );
  }

  const primaryUserId =
    env.TELEGRAM_E2E_PRIMARY_USER_ID?.trim() ?? primaryChatId;

  const secondaryChatId = env.TELEGRAM_E2E_SECONDARY_CHAT_ID?.trim();
  const secondaryUserId =
    env.TELEGRAM_E2E_SECONDARY_USER_ID?.trim() ?? secondaryChatId;
  const groupChatId = env.TELEGRAM_E2E_GROUP_CHAT_ID?.trim();

  const config: TelegramE2EConfig = {
    allowProduction:
      env.TELEGRAM_E2E_ALLOW_PRODUCTION === "1" ||
      env.TELEGRAM_E2E_ALLOW_MUTATION === "1",
    cleanupAfterRun: env.TELEGRAM_E2E_CLEANUP !== "0",
    databaseUrl,
    pollIntervalMs: parsePositiveInteger(
      env.TELEGRAM_E2E_POLL_INTERVAL_MS,
      1_000
    ),
    primaryChatId,
    primaryUserId,
    secondaryChatId,
    secondaryUserId,
    timeoutMs: parsePositiveInteger(env.TELEGRAM_E2E_TIMEOUT_MS, 20_000),
    token,
    webhookSecretToken,
    webhookUrl
  };

  if (groupChatId) {
    config.groupChatId = groupChatId;
  }

  if (secondaryChatId) {
    config.secondaryChatId = secondaryChatId;
  }

  if (secondaryUserId) {
    config.secondaryUserId = secondaryUserId;
  }

  return config;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
