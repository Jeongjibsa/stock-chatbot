import { describe, expect, it, vi } from "vitest";

import type { MarketDataFetchResult } from "@stock-chatbot/application";

import {
  buildPublicReportInsertInput,
  buildPublicBriefing,
  formatPublicBriefingBuildSummary,
  readPublicBriefingOutputPath
} from "./run-public-briefing.js";

describe("run-public-briefing", () => {
  it("reads a safe default output path", () => {
    expect(readPublicBriefingOutputPath({})).toBe(
      "artifacts/public-briefing/public-daily-briefing.json"
    );
    expect(
      readPublicBriefingOutputPath({
        PUBLIC_BRIEFING_OUTPUT_PATH: "/tmp/public.json"
      })
    ).toBe("/tmp/public.json");
  });

  it("builds a public briefing from market results and composition output", async () => {
    const marketResults: MarketDataFetchResult[] = [
      {
        status: "ok",
        data: {
          itemCode: "NASDAQ",
          itemName: "나스닥 종합",
          source: "yahoo_finance",
          sourceKey: "index:NASDAQ:IXIC",
          asOfDate: "2026-03-20",
          previousValue: 22090.6895,
          value: 21647.6113,
          changePercent: -2.01
        }
      },
      {
        status: "ok",
        data: {
          itemCode: "VIX",
          itemName: "VIX",
          source: "yahoo_finance",
          sourceKey: "index:CBOE:VIX",
          asOfDate: "2026-03-20",
          previousValue: 24.06,
          value: 26.78,
          changePercent: 11.31
        }
      },
      {
        status: "ok",
        data: {
          itemCode: "DXY",
          itemName: "달러인덱스",
          source: "fred",
          sourceKey: "index:DXY",
          asOfDate: "2026-03-13",
          previousValue: 119.82,
          value: 120.55,
          changePercent: 0.61
        }
      },
      {
        status: "ok",
        data: {
          itemCode: "USD_KRW",
          itemName: "USD/KRW 환율",
          source: "fred",
          sourceKey: "fx:USDKRW",
          asOfDate: "2026-03-13",
          previousValue: 1491.81,
          value: 1498.88,
          changePercent: 0.47
        }
      }
    ];

    const compose = vi.fn(async () => ({
      oneLineSummary: "미국 증시 약세와 달러 강세가 겹쳐 방어적으로 대응하시는 편이 좋습니다.",
      marketBullets: ["미국 지수 약세가 위험 선호를 눌렀습니다."],
      macroBullets: ["달러 강세가 이어져 환율 부담을 함께 확인하셔야 합니다."],
      fundFlowBullets: [],
      eventBullets: [],
      holdingTrendBullets: [],
      articleSummaryBullets: [],
      strategyBullets: [],
      riskBullets: ["변동성 확대 시 추격 매수는 보수적으로 보시는 편이 좋습니다."]
    }));

    const briefing = await buildPublicBriefing({
      runDate: "2026-03-20",
      marketDataAdapter: {
        fetchMany: vi.fn(async () => marketResults)
      },
      reportCompositionService: {
        compose
      }
    });

    expect(briefing.title).toBe("🗞️ 오늘의 시장 브리핑 (2026-03-20)");
    expect(briefing.marketSnapshot).toHaveLength(4);
    expect(briefing.indicatorTags).toEqual(["NASDAQ -2.01%"]);
    expect(briefing.keyIndicatorBullets).toEqual(
      expect.arrayContaining([
        "VIX 급등으로 변동성 경계가 강화됐습니다.",
        "NASDAQ 약세가 커지며 성장주 변동성이 확대됐습니다."
      ])
    );
    expect(briefing.marketSummary.overall).toBe("미국 지수 약세가 위험 선호를 눌렀습니다.");
    expect(compose).toHaveBeenCalledWith(
      expect.objectContaining({
        audience: "public_web"
      })
    );
  });

  it("falls back to rule-based output when composition fails", async () => {
    const marketResults: MarketDataFetchResult[] = [
      {
        status: "ok",
        data: {
          itemCode: "NASDAQ",
          itemName: "나스닥 종합",
          source: "yahoo_finance",
          sourceKey: "index:NASDAQ:IXIC",
          asOfDate: "2026-03-20",
          previousValue: 22090.6895,
          value: 21647.6113,
          changePercent: -2.01
        }
      },
      {
        status: "ok",
        data: {
          itemCode: "VIX",
          itemName: "VIX",
          source: "yahoo_finance",
          sourceKey: "index:CBOE:VIX",
          asOfDate: "2026-03-20",
          previousValue: 24.06,
          value: 26.78,
          changePercent: 11.31
        }
      },
      {
        status: "ok",
        data: {
          itemCode: "DXY",
          itemName: "달러인덱스",
          source: "fred",
          sourceKey: "index:DXY",
          asOfDate: "2026-03-13",
          previousValue: 119.82,
          value: 120.55,
          changePercent: 0.61
        }
      }
    ];

    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const briefing = await buildPublicBriefing({
      runDate: "2026-03-20",
      marketDataAdapter: {
        fetchMany: vi.fn(async () => marketResults)
      },
      reportCompositionService: {
        compose: vi.fn(async () => {
          throw new Error("Gemini API request failed with status 429");
        })
      }
    });

    expect(briefing.summaryLine).toBe(
      "달러 강세와 환율 부담이 이어지고 있어, 비중 확대보다 관망과 리스크 관리에 집중하시는 편이 좋습니다."
    );
    expect(briefing.marketSummary.overall.length).toBeGreaterThan(0);
    expect(briefing.marketInterpretation.macro.length).toBeGreaterThan(0);
    expect(briefing.riskBullets.length).toBeGreaterThan(0);
    expect(warning).toHaveBeenCalledWith(
      "[public-briefing] falling back to rule-based summary",
      "Gemini API request failed with status 429"
    );
  });

  it("formats a concise build summary for workflow logs", () => {
    expect(
      formatPublicBriefingBuildSummary({
        runDate: "2026-03-20",
        snapshotCount: 12,
        outputPath: "site/public-daily-briefing.json"
      })
    ).toBe(
      "[public-briefing] runDate=2026-03-20 snapshotCount=12 outputPath=site/public-daily-briefing.json"
    );
  });

  it("builds a public report insert payload without personal sections", async () => {
    const briefing = await buildPublicBriefing({
      runDate: "2026-03-20",
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      }
    });

    expect(
      buildPublicReportInsertInput({
        briefing
      })
    ).toMatchObject({
      reportDate: "2026-03-20",
      marketRegime: "Neutral",
      signals: [],
      indicatorTags: []
    });
  });
});
