import { describe, expect, it, vi } from "vitest";

import type { ReportDeliveryResult } from "@stock-chatbot/application";

import {
  buildTelegramSmokeMessage,
  readSmokeTestChatId,
  runTelegramSmokeTest
} from "./smoke-test.js";

describe("telegram smoke test", () => {
  it("requires a configured smoke test chat id", () => {
    expect(() => readSmokeTestChatId({})).toThrow("TELEGRAM_TEST_CHAT_ID is missing");
    expect(
      readSmokeTestChatId({
        TELEGRAM_TEST_CHAT_ID: "1001"
      })
    ).toBe("1001");
  });

  it("builds a smoke test message with current preview template", () => {
    const message = buildTelegramSmokeMessage(new Date("2026-03-21T00:00:00.000Z"));

    expect(message).toContain("Telegram smoke test");
    expect(message).toContain("🗞️ 오늘의 브리핑");
  });

  it("validates bot identity and sends a provider-backed smoke message", async () => {
    await expect(
      runTelegramSmokeTest({
        env: {
          TELEGRAM_TEST_CHAT_ID: "1001"
        },
        now: new Date("2026-03-21T00:00:00.000Z"),
        telegramIdentityClient: {
          getMe: vi.fn(async () => ({
            id: 1,
            isBot: true,
            firstName: "StockManager",
            username: "JungStock_bot"
          }))
        },
        deliveryAdapter: {
          deliver: vi.fn(
            async (): Promise<ReportDeliveryResult> => ({
              channel: "telegram",
              deliveryId: "1001:77",
              previewText: "preview",
              recipientId: "1001",
              status: "sent",
              transport: "provider"
            })
          )
        }
      })
    ).resolves.toEqual({
      botLabel: "@JungStock_bot",
      deliveryId: "1001:77",
      recipientId: "1001"
    });
  });
});
