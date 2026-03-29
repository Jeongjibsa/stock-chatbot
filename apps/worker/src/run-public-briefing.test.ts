import { describe, expect, it, vi } from "vitest";

import type { MarketDataFetchResult } from "@stock-chatbot/application";

import {
  buildPublicReportInsertInput,
  buildPublicBriefing,
  formatPublicBriefingBuildSummary,
  persistPublicBriefingArtifact,
  readPublicBriefingSession,
  readPublicBriefingLlmTimeoutMs,
  readPublicBriefingOutputPath,
  resolveDefaultPublicBriefingOutputPath,
  resolveFallbackPublicBriefingOutputPath,
} from "./run-public-briefing.js";

describe("run-public-briefing", () => {
  it("throws when no public briefing session is allowed for the current date", () => {
    expect(() =>
      readPublicBriefingSession(
        {
          REPORT_TIMEZONE: "Asia/Seoul"
        },
        {
          now: new Date("2026-03-29T00:30:00.000Z")
        }
      )
    ).toThrow("No public briefing session is allowed for the current date.");
  });

  it("reads a safe default output path", () => {
    expect(readPublicBriefingOutputPath({ BRIEFING_SESSION: "pre_market" })).toBe(
      resolveDefaultPublicBriefingOutputPath({
        briefingSession: "pre_market"
      })
    );
    expect(
      readPublicBriefingOutputPath({
        PUBLIC_BRIEFING_OUTPUT_PATH: "/tmp/public.json"
      })
    ).toBe("/tmp/public.json");
  });

  it("falls back to temporary storage when relative artifact writes fail", async () => {
    const mkdirSyncImpl = vi
      .fn()
      .mockImplementationOnce(() => {
        const error = new Error("missing cwd") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      });
    const writeFileSyncImpl = vi.fn();
    const warn = vi.fn();
    const briefing = await buildPublicBriefing({
      briefingSession: "pre_market",
      runDate: "2026-03-27",
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      }
    });

    const outputPath = persistPublicBriefingArtifact(
      {
        briefing,
        preferredOutputPath: resolveDefaultPublicBriefingOutputPath({
          briefingSession: "pre_market"
        })
      },
      {
        mkdirSyncImpl,
        warn,
        writeFileSyncImpl
      }
    );

    expect(outputPath).toBe(
      resolveFallbackPublicBriefingOutputPath({
        briefingSession: "pre_market"
      })
    );
    expect(writeFileSyncImpl).toHaveBeenCalledWith(
      resolveFallbackPublicBriefingOutputPath({
        briefingSession: "pre_market"
      }),
      expect.stringContaining("\"briefingSession\": \"pre_market\"")
    );
    expect(warn).toHaveBeenCalledWith(
      "[public-briefing] switching artifact output path to temporary storage",
      resolveDefaultPublicBriefingOutputPath({
        briefingSession: "pre_market"
      }),
      resolveFallbackPublicBriefingOutputPath({
        briefingSession: "pre_market"
      }),
      "missing cwd"
    );
  });

  it("reads a safe public briefing llm timeout", () => {
    expect(readPublicBriefingLlmTimeoutMs({})).toBe(8000);
    expect(
      readPublicBriefingLlmTimeoutMs({
        PUBLIC_BRIEFING_LLM_TIMEOUT_MS: "4500"
      })
    ).toBe(4500);
    expect(
      readPublicBriefingLlmTimeoutMs({
        PUBLIC_BRIEFING_LLM_TIMEOUT_MS: "0"
      })
    ).toBe(8000);
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
      marketBullets: [
        "이번 오전 브리핑은 미국장 마감 결과를 바탕으로 오늘 국내장 시초가와 장 초반 수급 방향을 가늠하는 데 목적이 있습니다.",
        "미국 지수 약세가 위험 선호를 눌렀습니다."
      ],
      macroBullets: ["달러 강세가 이어져 환율 부담을 함께 확인하셔야 합니다."],
      fundFlowBullets: [],
      eventBullets: ["환율과 외국인 선물 흐름이 같은 방향인지 먼저 확인하셔야 합니다."],
      holdingTrendBullets: [],
      articleSummaryBullets: [],
      headlineEvents: [
        {
          sourceLabel: "Reuters",
          headline: "Dollar strength persists",
          summary: "달러 강세 뉴스가 반복돼 환율 부담을 같이 봐야 합니다."
        }
      ],
      strategyBullets: [],
      riskBullets: ["변동성 확대 시 추격 매수는 보수적으로 보시는 편이 좋습니다."],
      trendNewsBullets: ["달러 강세 뉴스가 반복돼 환율 부담을 같이 봐야 합니다."],
      newsReferences: [
        {
          sourceLabel: "Reuters",
          title: "Dollar strength persists",
          url: "https://example.com/reuters-dollar"
        }
      ]
    }));

    const briefing = await buildPublicBriefing({
      briefingSession: "pre_market",
      compositionTimeoutMs: 8000,
      runDate: "2026-03-20",
      marketDataAdapter: {
        fetchMany: vi.fn(async () => marketResults)
      },
      reportCompositionService: {
        compose
      }
    });

    expect(briefing.title).toBe("🗞️ 장 시작 전 시장 브리핑 (2026-03-20)");
    expect(briefing.marketSnapshot).toHaveLength(4);
    expect(briefing.indicatorTags).toEqual(["NASDAQ -2.01%"]);
    expect(briefing.sessionRole).toBe("미장 마감 분석 기반 국장 시초가 예측");
    expect(briefing.keyIndicatorBullets).toEqual(
      expect.arrayContaining([
        "VIX 급등으로 변동성 경계가 강화됐습니다.",
        "NASDAQ 약세가 커지며 성장주 변동성이 확대됐습니다."
      ])
    );
    expect(briefing.marketSummary.purpose).toBe(
      "이번 오전 브리핑은 미국장 마감 결과를 바탕으로 오늘 국내장 시초가와 장 초반 수급 방향을 가늠하는 데 목적이 있습니다."
    );
    expect(briefing.marketSummary.overall).toBe("미국 지수 약세가 위험 선호를 눌렀습니다.");
    expect(briefing.headlineEvents).toEqual([
      {
        sourceLabel: "Reuters",
        headline: "Dollar strength persists",
        summary: "달러 강세 뉴스가 반복돼 환율 부담을 같이 봐야 합니다."
      }
    ]);
    expect(compose).toHaveBeenCalledWith(
      expect.objectContaining({
        audience: "public_web",
        timeoutMs: 8000
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
      briefingSession: "pre_market",
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
    expect(briefing.headlineEvents).toEqual([]);
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
        briefingSession: "pre_market",
        runDate: "2026-03-20",
        snapshotCount: 12,
        outputPath: "site/public-daily-briefing.json"
      })
    ).toBe(
      "[public-briefing] runDate=2026-03-20 session=pre_market snapshotCount=12 outputPath=site/public-daily-briefing.json"
    );
  });

  it("builds a public report insert payload without personal sections", async () => {
    const briefing = await buildPublicBriefing({
      briefingSession: "pre_market",
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
      indicatorTags: [],
      newsReferences: []
    });
  });
});
