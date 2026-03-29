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
        eventBullets: ["환율과 외국인 선물 흐름이 같은 방향인지 먼저 확인하셔야 합니다."],
        headlineEvents: [
          {
            sourceLabel: "Reuters",
            headline: "Dollar strength persists",
            summary: "달러 강세가 이어져 외환 부담을 같이 보셔야 합니다."
          }
        ],
        newsReferences: [
          {
            sourceLabel: "Reuters",
            title: "Dollar strength persists",
            url: "https://example.com/reuters-dollar"
          }
        ],
        riskBullets: ["변동성 재확인 구간입니다."]
      })
    );

    expect(markdown).toContain("# 🗞️ 장 시작 전 시장 브리핑 (2026-03-21)");
    expect(markdown).toContain("## 브리핑 역할");
    expect(markdown).toContain("## 시장 종합 해석");
    expect(markdown).toContain("**브리핑 목적**:");
    expect(markdown).toContain("## 핵심 뉴스 이벤트");
    expect(markdown).toContain("**[Reuters]** Dollar strength persists");
    expect(markdown).toContain("달러 강세가 이어져 외환 부담을 같이 보셔야 합니다.");
    expect(markdown).toContain("## 오늘 대응 기준");
    expect(markdown).toContain("## 오늘 시장에서 읽어야 할 포인트");
    expect(markdown).toContain("## 참고한 뉴스 출처");
    expect(markdown).toContain(
      "- [Reuters | Dollar strength persists](https://example.com/reuters-dollar)"
    );
    expect(markdown).not.toContain("**[Reuters]** [Dollar strength persists]");
    expect(markdown).not.toContain("브리핑용 요약 제안");
    expect(markdown).toContain("> ❗ 이 페이지는 공개 프리마켓 브리핑이며");
    expect(markdown).not.toContain("비중 확대");
    expect(markdown).not.toContain("포트 적합성");
  });
});
