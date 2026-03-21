import { describe, expect, it } from "vitest";

import { MockTelegramDeliveryAdapter } from "./report-delivery.js";

describe("MockTelegramDeliveryAdapter", () => {
  it("returns mocked delivery results", async () => {
    const adapter = new MockTelegramDeliveryAdapter({
      deliveryIdFactory: () => "delivery-1"
    });

    await expect(
      adapter.deliver({
        channel: "telegram",
        recipientId: "user-1",
        renderedText: "preview"
      })
    ).resolves.toEqual({
      channel: "telegram",
      deliveryId: "delivery-1",
      previewText: "preview",
      recipientId: "user-1",
      status: "mocked",
      transport: "mock"
    });
  });
});
