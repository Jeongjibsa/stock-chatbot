import { describe, expect, it } from "vitest";

import {
  buildGroupNewMemberUpdate,
  buildGroupTextMessageUpdate,
  buildPrivateTextMessageUpdate
} from "./webhook-driver.js";

describe("telegram e2e webhook driver", () => {
  it("builds private command updates with bot_command entities", () => {
    const update = buildPrivateTextMessageUpdate({
      chatId: "1001",
      userId: "1001",
      text: "/start",
      updateId: 101
    });

    expect(update.update_id).toBe(101);
    expect("message" in update && update.message.text).toBe("/start");
    expect("message" in update && update.message.entities).toEqual([
      expect.objectContaining({
        type: "bot_command",
        offset: 0,
        length: 6
      })
    ]);
  });

  it("builds group text updates", () => {
    const update = buildGroupTextMessageUpdate({
      chatId: "-1001",
      userId: "2001",
      text: "/register",
      updateId: 102
    });

    expect("message" in update && update.message.chat).toEqual(
      expect.objectContaining({
        id: -1001,
        type: "supergroup"
      })
    );
  });

  it("builds group join updates", () => {
    const update = buildGroupNewMemberUpdate({
      chatId: "-1001",
      joinedUserId: "2001",
      joinedUserName: "Jisung",
      updateId: 103
    });

    expect("message" in update && update.message.new_chat_members).toEqual([
      expect.objectContaining({
        id: 2001,
        first_name: "Jisung"
      })
    ]);
  });
});
