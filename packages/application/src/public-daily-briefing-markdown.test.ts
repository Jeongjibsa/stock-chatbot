import { describe, expect, it } from "vitest";

import { buildPublicDailyBriefing } from "./public-daily-briefing.js";
import { renderPublicDailyBriefingMarkdown } from "./public-daily-briefing-markdown.js";

describe("renderPublicDailyBriefingMarkdown", () => {
  it("renders markdown blocks for public reports without personalized fields", () => {
    const markdown = renderPublicDailyBriefingMarkdown(
      buildPublicDailyBriefing({
        runDate: "2026-03-21",
        summaryLine: "지수 방향성보다 내부 체력과 밸류 부담을 함께 봐야 하는 구간입니다.",
        marketResults: [],
        keyIndicatorBullets: ["VIX 급등으로 변동성 경계가 강화됐습니다."],
        marketBullets: ["미국 지수 약세가 위험 선호를 눌렀습니다."],
        macroBullets: ["달러 강세가 이어지고 있습니다."],
        fundFlowBullets: [],
        eventBullets: ["중동 리스크를 계속 확인해야 합니다."],
        riskBullets: ["변동성 재확인 구간입니다."]
      })
    );

    expect(markdown).toContain("1. # 🗞️ 오늘의 시장 브리핑 (2026-03-21)");
    expect(markdown).toContain("3. 시장 종합 해석");
    expect(markdown).toContain("11. 오늘 시장에서 읽어야 할 포인트");
    expect(markdown).toContain("12. ❗ 이 페이지는 공개 시장 브리핑이며");
    expect(markdown).not.toContain("비중 확대");
    expect(markdown).not.toContain("포트 적합성");
  });
});
