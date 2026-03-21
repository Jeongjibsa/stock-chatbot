import { describe, expect, it } from "vitest";

import {
  buildGroupRegisterSuccessMessage,
  buildGroupRegistrationReminder,
  buildHelpMessage,
  GroupJoinWelcomeStore,
  buildNewMemberWelcomeMessage,
  buildPrivateRegisterSuccessMessage,
  buildStartMessage,
  extractNewlyJoinedMemberName,
  GroupRegistrationReminderStore,
  isGroupChat
} from "./onboarding.js";

describe("telegram onboarding helpers", () => {
  it("builds a Korean start message with next-step guidance", () => {
    const message = buildStartMessage();

    expect(message).toContain("안녕하세요. StockManager 봇입니다.");
    expect(message).toContain("1. /register - 개인 발송 대상 등록");
    expect(message).toContain("2. /report - 지금 브리핑 확인");
    expect(message).toContain("/portfolio_add - 보유 종목 추가");
  });

  it("builds a concise help message", () => {
    const message = buildHelpMessage();

    expect(message).toContain("사용 방법은 간단합니다.");
    expect(message).toContain("1. /register 로 등록");
    expect(message).toContain("2. /report 로 브리핑 확인");
    expect(message).toContain("/market_items - 추적 지표 확인");
  });

  it("builds a private register success message with next actions", () => {
    const message = buildPrivateRegisterSuccessMessage();

    expect(message).toContain("등록이 완료되었습니다.");
    expect(message).toContain("/report 로 오늘 브리핑");
    expect(message).toContain("/portfolio_add");
    expect(message).toContain("/portfolio_list");
    expect(message).toContain("보유 종목이 없어도");
  });

  it("builds a group register success message that redirects to DM", () => {
    const message = buildGroupRegisterSuccessMessage();

    expect(message).toContain("계정 등록은 완료되었습니다.");
    expect(message).toContain("DM에서 /register");
    expect(message).toContain("/portfolio_add");
  });

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

  it("deduplicates join welcome messages within a short time window", () => {
    const store = new GroupJoinWelcomeStore(10_000);

    expect(store.shouldWelcome("user-1", "group-1", 1_000)).toBe(true);
    expect(store.shouldWelcome("user-1", "group-1", 5_000)).toBe(false);
    expect(store.shouldWelcome("user-1", "group-1", 12_000)).toBe(true);
    expect(store.shouldWelcome("user-2", "group-1", 5_000)).toBe(true);
    expect(store.shouldWelcome("user-1", "group-2", 5_000)).toBe(true);
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
