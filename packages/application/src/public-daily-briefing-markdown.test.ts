import { describe, expect, it } from "vitest";

import { buildPublicDailyBriefing } from "./public-daily-briefing.js";
import { renderPublicDailyBriefingMarkdown } from "./public-daily-briefing-markdown.js";

describe("renderPublicDailyBriefingMarkdown", () => {
  it("renders markdown blocks for public reports", () => {
    const markdown = renderPublicDailyBriefingMarkdown(
      buildPublicDailyBriefing({
        runDate: "2026-03-21",
        summaryLine: "달러 강세와 변동성 확대를 함께 점검하셔야 합니다.",
        marketResults: [],
        keyIndicatorBullets: ["VIX 급등으로 변동성 경계가 강화됐습니다."],
        marketBullets: ["미국 지수 약세가 위험 선호를 눌렀습니다."],
        macroBullets: ["달러 강세가 이어지고 있습니다."],
        fundFlowBullets: [],
        eventBullets: ["중동 리스크를 계속 확인하셔야 합니다."],
        riskBullets: ["추격 매수는 보수적으로 보시는 편이 좋습니다."]
      })
    );

    expect(markdown).toContain("# 오늘의 브리핑 (2026-03-21 기준)");
    expect(markdown).toContain("## 한 줄 요약");
    expect(markdown).toContain("## 거시 시장 스냅샷");
    expect(markdown).toContain("> 이 브리핑은 공개 가능한 시장 요약만 포함하며");
  });
});
