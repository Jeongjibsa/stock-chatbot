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
      marketBullets: ["미국 증시 약세가 두드러졌습니다."],
      headlineEvents: [
        {
          sourceLabel: "Reuters",
          headline: "Dollar strength persists",
          summary: "브리핑용 요약 제안: 달러 강세가 이어져 외환 부담을 같이 보셔야 합니다."
        }
      ],
      trendNewsBullets: ["금리와 달러 강세가 동시에 부담으로 작용하고 있습니다."],
      newsReferences: [
        {
          sourceLabel: "Reuters",
          title: "Dollar strength persists",
          url: "https://example.com/reuters-dollar"
        }
      ]
    });

    const html = renderPublicDailyBriefingHtml(briefing);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('rel="canonical" href="/briefings/2026-03-20/pre-market/"');
    expect(html).toContain("오늘 한 줄 요약");
    expect(html).toContain("시장 종합 해석");
    expect(html).toContain("브리핑 목적");
    expect(html).toContain("핵심 뉴스 이벤트");
    expect(html).toContain("달러 강세가 이어져 외환 부담을 같이 보셔야 합니다.");
    expect(html).not.toContain("브리핑용 요약 제안");
    expect(html).toContain("거시 트렌드 뉴스");
    expect(html).toContain("참고한 뉴스 출처");
    expect(html).toContain("오늘의 리스크 포인트");
    expect(html).toContain("S&amp;P500");
    expect(html).toContain(">Reuters | Dollar strength persists<");
    expect(html).not.toContain("Reuters: Dollar strength persists (");
    expect(html).not.toContain("포트 적합성");
    expect(html).not.toContain("비중 확대");
  });

  it("filters irrelevant headline events and duplicate public references before rendering", () => {
    const briefing = buildPublicDailyBriefing({
      runDate: "2026-03-28",
      summaryLine: "주말에는 다음 주 체크포인트를 정리하셔야 합니다.",
      marketResults: [],
      headlineEvents: [
        {
          sourceLabel: "Yahoo Finance",
          headline: "Treasury yields rise as traders await Fed speakers",
          summary: "금리 이슈가 시장 기대를 조정하는지 함께 보셔야 합니다."
        },
        {
          sourceLabel: "MarketWatch",
          headline:
            "Parents with student loans could fall into default if they don’t take steps soon",
          summary: "개인 재무 기사입니다."
        }
      ],
      newsReferences: [
        {
          sourceLabel: "Yahoo Finance",
          title: "Treasury yields rise as traders await Fed speakers",
          url: "https://example.com/yahoo-market"
        },
        {
          sourceLabel: "MarketWatch",
          title:
            "Parents with student loans could fall into default if they don’t take steps soon",
          url: "https://example.com/personal"
        },
        {
          sourceLabel: "Yahoo Finance",
          title: "Treasury yields rise as traders await Fed speakers",
          url: "https://example.com/yahoo-market"
        }
      ]
    });

    const html = renderPublicDailyBriefingHtml(briefing);

    expect(html).toContain("Treasury yields rise as traders await Fed speakers");
    expect(html).not.toContain(
      "Parents with student loans could fall into default if they don’t take steps soon"
    );
    expect(html.match(/example.com\/yahoo-market/g)?.length ?? 0).toBe(1);
  });
});
