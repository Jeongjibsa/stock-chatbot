import { describe, expect, it } from "vitest";

import { readTelegramE2EConfig } from "./env.js";

describe("readTelegramE2EConfig", () => {
  it("reads the required telegram e2e env values", () => {
    expect(
      readTelegramE2EConfig({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_WEBHOOK_URL: "https://example.com/api/telegram/webhook",
        TELEGRAM_WEBHOOK_SECRET_TOKEN: "secret",
        DATABASE_URL: "postgresql://localhost/test",
        TELEGRAM_TEST_CHAT_ID: "1001"
      })
    ).toEqual(
      expect.objectContaining({
        token: "token",
        webhookUrl: "https://example.com/api/telegram/webhook",
        webhookSecretToken: "secret",
        databaseUrl: "postgresql://localhost/test",
        primaryChatId: "1001",
        primaryUserId: "1001",
        cleanupAfterRun: true
      })
    );
  });

  it("allows explicit e2e chat ids and production opt-in", () => {
    expect(
      readTelegramE2EConfig({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_WEBHOOK_URL: "https://example.com/api/telegram/webhook",
        TELEGRAM_WEBHOOK_SECRET_TOKEN: "secret",
        DATABASE_URL: "postgresql://localhost/test",
        TELEGRAM_E2E_PRIMARY_CHAT_ID: "2001",
        TELEGRAM_E2E_PRIMARY_USER_ID: "3001",
        TELEGRAM_E2E_ALLOW_PRODUCTION: "1",
        TELEGRAM_E2E_CLEANUP: "0"
      })
    ).toEqual(
      expect.objectContaining({
        primaryChatId: "2001",
        primaryUserId: "3001",
        allowProduction: true,
        cleanupAfterRun: false
      })
    );
  });

  it("prefers a dedicated e2e database url when provided", () => {
    expect(
      readTelegramE2EConfig({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_WEBHOOK_URL: "https://example.com/api/telegram/webhook",
        TELEGRAM_WEBHOOK_SECRET_TOKEN: "secret",
        TELEGRAM_E2E_DATABASE_URL: "postgresql://neon/prod",
        DATABASE_URL: "postgresql://localhost/test",
        TELEGRAM_TEST_CHAT_ID: "1001"
      }).databaseUrl
    ).toBe("postgresql://neon/prod");
  });
});
