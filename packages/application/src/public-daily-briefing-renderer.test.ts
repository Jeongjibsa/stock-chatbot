import { describe, expect, it } from "vitest";

import { buildPublicDailyBriefing } from "./public-daily-briefing.js";
import { renderPublicDailyBriefingHtml } from "./public-daily-briefing-renderer.js";

describe("public daily briefing renderer", () => {
  it("renders public briefing HTML with public-only structure", () => {
    const briefing = buildPublicDailyBriefing({
      runDate: "2026-03-20",
      summaryLine: "표면 흐름은 유지되지만 구조 리스크와 과열 신호를 함께 점검해야 합니다.",
      marketResults: [
        {
          status: "ok",
          data: {
            itemCode: "SP500",
            itemName: "S&P 500",
            sourceKey: "index:SP:SPX",
            source: "yahoo_finance",
            asOfDate: "2026-03-20",
            previousValue: 6606.49,
            value: 6506.48,
            changePercent: -1.5138
          }
        }
      ],
      marketBullets: ["미국 증시 약세가 두드러졌습니다."]
    });

    const html = renderPublicDailyBriefingHtml(briefing);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('rel="canonical" href="/briefings/2026-03-20/pre-market/"');
    expect(html).toContain("오늘 한 줄 요약");
    expect(html).toContain("시장 종합 해석");
    expect(html).toContain("오늘의 리스크 포인트");
    expect(html).toContain("S&amp;P500");
    expect(html).not.toContain("포트 적합성");
    expect(html).not.toContain("비중 확대");
  });
});
