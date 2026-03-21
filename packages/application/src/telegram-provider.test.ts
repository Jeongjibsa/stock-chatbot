import { describe, expect, it, vi } from "vitest";

import {
  TelegramBotApiClient,
  TelegramReportDeliveryAdapter
} from "./report-delivery.js";

describe("TelegramBotApiClient", () => {
  it("loads bot profile from getMe", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          result: {
            id: 1,
            is_bot: true,
            first_name: "StockManager",
            username: "JungStock_bot"
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );
    const client = new TelegramBotApiClient({
      token: "telegram-token",
      fetchFn
    });

    await expect(client.getMe()).resolves.toEqual({
      id: 1,
      isBot: true,
      firstName: "StockManager",
      username: "JungStock_bot"
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.telegram.org/bottelegram-token/getMe",
      undefined
    );
  });

  it("sends a Telegram message through provider API", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          result: {
            chat: {
              id: 1001
            },
            message_id: 77,
            text: "report"
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );
    const client = new TelegramBotApiClient({
      token: "telegram-token",
      fetchFn
    });

    await expect(
      client.sendMessage({
        chatId: "1001",
        text: "report"
      })
    ).resolves.toEqual({
      chatId: "1001",
      messageId: "77",
      text: "report"
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.telegram.org/bottelegram-token/sendMessage",
      expect.objectContaining({
        method: "POST"
      })
    );
    const [, init] = fetchFn.mock.calls[0] as unknown as [unknown, Record<string, unknown>];

    expect(init.body).toContain("\"chat_id\":\"1001\"");
    expect(init.body).toContain("\"disable_notification\":true");
  });

  it("surfaces Telegram API errors", async () => {
    const client = new TelegramBotApiClient({
      token: "telegram-token",
      fetchFn: vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: false,
            description: "chat not found"
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        )
      )
    });

    await expect(
      client.sendMessage({
        chatId: "1001",
        text: "report"
      })
    ).rejects.toThrow("chat not found");
  });
});

describe("TelegramReportDeliveryAdapter", () => {
  it("maps provider delivery results into report delivery contract", async () => {
    const adapter = new TelegramReportDeliveryAdapter({
      telegramClient: {
        sendMessage: vi.fn(async () => ({
          chatId: "1001",
          messageId: "55",
          text: "preview"
        }))
      } as unknown as TelegramBotApiClient
    });

    await expect(
      adapter.deliver({
        channel: "telegram",
        recipientId: "1001",
        renderedText: "preview"
      })
    ).resolves.toEqual({
      channel: "telegram",
      deliveryId: "1001:55",
      previewText: "preview",
      recipientId: "1001",
      status: "sent",
      transport: "provider"
    });
  });
});
