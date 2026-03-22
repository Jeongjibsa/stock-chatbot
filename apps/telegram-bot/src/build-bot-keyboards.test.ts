import { describe, expect, it } from "vitest";

import {
  buildHomeReplyKeyboard,
  buildSettingsInlineKeyboard
} from "./build-bot.js";

describe("telegram button keyboards", () => {
  it("builds the guided home reply keyboard", () => {
    const keyboard = buildHomeReplyKeyboard();
    const rows = (keyboard as any).keyboard;

    expect(JSON.stringify(rows)).toContain("📊 브리핑 보기");
    expect(JSON.stringify(rows)).toContain("➕ 종목 추가");
    expect(JSON.stringify(rows)).toContain("📁 내 종목");
    expect(JSON.stringify(rows)).toContain("⚙️ 설정");
  });

  it("builds the settings inline keyboard without removing slash-command semantics", () => {
    const keyboard = buildSettingsInlineKeyboard();
    const rows = (keyboard as any).inline_keyboard;

    expect(JSON.stringify(rows)).toContain("settings:report_on");
    expect(JSON.stringify(rows)).toContain("settings:report_off");
    expect(JSON.stringify(rows)).toContain("settings:mode_compact");
    expect(JSON.stringify(rows)).toContain("settings:mode_standard");
    expect(JSON.stringify(rows)).toContain("settings:link_on");
    expect(JSON.stringify(rows)).toContain("settings:link_off");
  });
});
