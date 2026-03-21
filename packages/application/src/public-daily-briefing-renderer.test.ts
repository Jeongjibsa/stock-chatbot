import { describe, expect, it } from "vitest";

import {
  buildPublicDailyBriefing
} from "./public-daily-briefing.js";
import { renderPublicDailyBriefingHtml } from "./public-daily-briefing-renderer.js";

describe("public daily briefing renderer", () => {
  it("renders public briefing HTML with canonical path and snapshot cards", () => {
    const briefing = buildPublicDailyBriefing({
      runDate: "2026-03-20",
      summaryLine: "달러 강세가 이어져 보수적 대응이 필요합니다.",
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
    expect(html).toContain('rel="canonical" href="/briefings/2026-03-20/"');
    expect(html).toContain("거시 시장 스냅샷");
    expect(html).toContain("6,606.49 → 6,506.48");
    expect(html).toContain("▼ 1.51%");
  });
});
