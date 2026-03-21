import { describe, expect, it } from "vitest";

import {
  buildGroupRegistrationReminder,
  buildNewMemberWelcomeMessage,
  extractNewlyJoinedMemberName,
  GroupRegistrationReminderStore,
  isGroupChat
} from "./onboarding.js";

describe("telegram onboarding helpers", () => {
  it("builds a group registration reminder", () => {
    expect(buildGroupRegistrationReminder()).toContain("/register");
    expect(buildGroupRegistrationReminder()).toContain("DM");
  });

  it("builds a welcome message for new group members", () => {
    const message = buildNewMemberWelcomeMessage(["User A", "User B"]);

    expect(message).toContain("User A, User B님, 환영합니다.");
    expect(message).toContain("/register");
  });

  it("only reminds the same user once per group", () => {
    const store = new GroupRegistrationReminderStore();

    expect(store.shouldRemind("user-1", "group-1")).toBe(true);
    expect(store.shouldRemind("user-1", "group-1")).toBe(false);
    expect(store.shouldRemind("user-1", "group-2")).toBe(true);
    expect(store.shouldRemind("user-2", "group-1")).toBe(true);
  });

  it("detects group-like chats", () => {
    expect(isGroupChat("group")).toBe(true);
    expect(isGroupChat("supergroup")).toBe(true);
    expect(isGroupChat("private")).toBe(false);
    expect(isGroupChat("channel")).toBe(false);
  });

  it("extracts a joined member name from chat_member updates", () => {
    expect(
      extractNewlyJoinedMemberName({
        oldStatus: "left",
        newStatus: "member",
        user: {
          first_name: "Jisung",
          is_bot: false
        }
      })
    ).toBe("Jisung");

    expect(
      extractNewlyJoinedMemberName({
        oldStatus: "member",
        newStatus: "administrator",
        user: {
          first_name: "Already In",
          is_bot: false
        }
      })
    ).toBeNull();

    expect(
      extractNewlyJoinedMemberName({
        oldStatus: "left",
        newStatus: "member",
        user: {
          first_name: "Bot",
          is_bot: true
        }
      })
    ).toBeNull();
  });
});
