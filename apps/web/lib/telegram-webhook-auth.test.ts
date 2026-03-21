import { describe, expect, it } from "vitest";

import { isAuthorizedTelegramWebhookRequest } from "./telegram-webhook-auth";

describe("isAuthorizedTelegramWebhookRequest", () => {
  it("allows requests when webhook secret is unset", () => {
    expect(
      isAuthorizedTelegramWebhookRequest(new Request("https://example.com"))
    ).toBe(true);
  });

  it("validates secret header", () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-telegram-bot-api-secret-token": "secret-value"
      }
    });

    expect(
      isAuthorizedTelegramWebhookRequest(request, {
        TELEGRAM_WEBHOOK_SECRET_TOKEN: "secret-value"
      })
    ).toBe(true);
    expect(
      isAuthorizedTelegramWebhookRequest(request, {
        TELEGRAM_WEBHOOK_SECRET_TOKEN: "other-secret"
      })
    ).toBe(false);
  });
});
