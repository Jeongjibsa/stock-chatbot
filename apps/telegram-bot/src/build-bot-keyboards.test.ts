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
    expect(JSON.stringify(rows)).not.toContain("📈 관심 지표");
  });

  it("builds the simplified settings inline keyboard", () => {
    const keyboard = buildSettingsInlineKeyboard();
    const rows = (keyboard as any).inline_keyboard;

    expect(JSON.stringify(rows)).toContain("settings:report_on");
    expect(JSON.stringify(rows)).toContain("settings:report_off");
    expect(JSON.stringify(rows)).toContain("settings:time_change");
    expect(JSON.stringify(rows)).not.toContain("mode_compact");
    expect(JSON.stringify(rows)).not.toContain("link_on");
  });
});
