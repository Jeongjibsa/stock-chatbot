import { describe, expect, it, vi } from "vitest";

import { DailyReportOrchestrator } from "./daily-report-orchestrator.js";
import type { MarketDataAdapter, MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief } from "./news.js";

describe("DailyReportOrchestrator", () => {
  it("completes with partial success when some market items fail", async () => {
    const marketResults: MarketDataFetchResult[] = [
      {
        status: "ok",
        data: {
          itemCode: "NASDAQ",
          itemName: "나스닥 종합",
          source: "fred",
          sourceKey: "index:NASDAQ:IXIC",
          asOfDate: "2026-03-20",
          value: 18000
        }
      },
      {
        status: "error",
        errorCode: "unsupported_source",
        sourceKey: "index:KRX:KOSPI",
        message: "unsupported"
      }
    ];
    const marketDataAdapter: MarketDataAdapter = {
      fetchMany: vi.fn(async () => marketResults)
    };
    const reportRunRepository = {
      startRun: vi.fn(async () => ({
        created: true,
        run: {
          id: "run-1",
          status: "running"
        }
      })),
      completeRun: vi.fn(async (input) => ({
        id: input.id,
        status: input.status,
        reportText: input.reportText,
        errorMessage: input.errorMessage
      }))
    };
    const unavailableNewsBriefs: HoldingNewsBrief[] = [
      {
        holding: {
          companyName: "Apple Inc.",
          symbol: "AAPL",
          exchange: "US"
        },
        articles: [],
        events: [],
        status: "unavailable",
        errorMessage: "관련 뉴스를 찾지 못했습니다."
      }
    ];
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter,
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [
          {
            companyName: "Apple Inc.",
            symbol: "AAPL",
            exchange: "US"
          }
        ])
      },
      portfolioNewsBriefService: {
        generateBriefsForHoldings: vi.fn(async () => unavailableNewsBriefs)
      },
      reportRunRepository,
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [
          {
            itemCode: "NASDAQ",
            itemName: "나스닥 종합",
            sourceKey: "index:NASDAQ:IXIC"
          },
          {
            itemCode: "KOSPI",
            itemName: "코스피",
            sourceKey: "index:KRX:KOSPI"
          }
        ])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-20",
      scheduleType: "daily-pre-market"
    });

    expect(result.status).toBe("partial_success");
    expect(result.publicBriefingLinked).toBe(false);
    expect(result.reportText).toContain("1. 🗞️ 오늘의 포트폴리오 프리마켓 브리핑");
    expect(result.reportText).toContain("6. ⚠️ 오늘 반드시 볼 리스크");
    expect(result.reportText).toContain("일부 시장 지표는 지연 또는 누락 상태라 추가 확인이 필요합니다.");
    expect(result.reportText).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
    expect(reportRunRepository.completeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "partial_success",
        errorMessage: expect.stringContaining("index:KRX:KOSPI")
      })
    );
  });

  it("skips duplicate runs without calling downstream dependencies", async () => {
    const marketDataAdapter: MarketDataAdapter = {
      fetchMany: vi.fn(async () => [])
    };
    const portfolioHoldingRepository = {
      listByUserId: vi.fn(async () => [])
    };
    const userMarketWatchRepository = {
      listEffectiveByUserId: vi.fn(async () => [])
    };
    const reportRunRepository = {
      startRun: vi.fn(async () => ({
        created: false,
        run: {
          id: "run-1",
          reportText: "existing report",
          status: "completed"
        }
      })),
      completeRun: vi.fn()
    };
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter,
      portfolioHoldingRepository,
      reportRunRepository,
      userMarketWatchRepository
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-20",
      scheduleType: "daily-pre-market"
    });

    expect(result.status).toBe("skipped_duplicate");
    expect(result.reportText).toBe("existing report");
    expect(result.publicBriefingLinked).toBe(false);
    expect(marketDataAdapter.fetchMany).not.toHaveBeenCalled();
    expect(reportRunRepository.completeRun).not.toHaveBeenCalled();
  });

  it("hydrates holding price snapshots into the rendered report", async () => {
    const reportRunRepository = {
      startRun: vi.fn(async () => ({
        created: true,
        run: {
          id: "run-snapshot",
          status: "running"
        }
      })),
      completeRun: vi.fn(async (input) => ({
        id: input.id,
        status: input.status,
        reportText: input.reportText,
        errorMessage: input.errorMessage
      }))
    };
    const orchestrator = new DailyReportOrchestrator({
      holdingPriceSnapshotProvider: {
        getHoldingPriceSnapshot: vi.fn(async () => ({
          asOfDate: "2026-03-20",
          currentPrice: 182000,
          previousClose: 184000,
          changePercent: -1.09
        }))
      },
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [
          {
            companyName: "삼성전자",
            symbol: "005930",
            exchange: "KR"
          }
        ])
      },
      reportRunRepository,
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-20",
      scheduleType: "telegram-report"
    });

    expect(result.reportText).toContain(
      "시세 스냅샷은 184,000 → 182,000, 전일 대비 -1.09% 기준입니다."
    );
  });

  it("marks the run as failed when an unexpected error occurs after startRun", async () => {
    const reportRunRepository = {
      startRun: vi.fn(async () => ({
        created: true,
        run: {
          id: "run-failed",
          status: "running"
        }
      })),
      completeRun: vi.fn(async (input) => ({
        id: input.id,
        status: input.status,
        reportText: input.reportText ?? null,
        errorMessage: input.errorMessage
      }))
    };
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [])
      },
      publicBriefingBaseUrl: "https://example.com",
      publicReportRepository: {
        findLatestByReportDateAndSession: vi.fn(async () => {
          throw new Error('column "indicator_tags" does not exist');
        }),
        findLatestByReportDate: vi.fn(async () => {
          throw new Error('column "indicator_tags" does not exist');
        })
      },
      reportRunRepository,
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-20",
      scheduleType: "telegram-report"
    });

    expect(result.status).toBe("failed");
    expect(result.reportText).toBe("");
    expect(reportRunRepository.completeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "run-failed",
        status: "failed",
        errorMessage: expect.stringContaining("indicator_tags")
      })
    );
  });

  it("passes optional personalized rebalancing payload into the rendered report", async () => {
    const reportRunRepository = {
      startRun: vi.fn(async () => ({
        created: true,
        run: {
          id: "run-rebalancing",
          status: "running"
        }
      })),
      completeRun: vi.fn(async (input) => ({
        id: input.id,
        status: input.status,
        reportText: input.reportText,
        errorMessage: input.errorMessage
      }))
    };
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [
          {
            companyName: "삼성전자",
            symbol: "005930",
            exchange: "KR"
          }
        ])
      },
      reportRunRepository,
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-20",
      scheduleType: "telegram-report",
      portfolioRebalancing: {
        selectedProfile: "balanced",
        marketOverlay: {
          market: "KOSPI",
          marketCompositeLabel: "다소과열",
          sentimentLabel: "적정",
          marketStrengthLabel: "적정",
          marketFundamentalLabel: "과열",
          blackSwanLabel: "과열",
          buffettByMarketLabel: "매우 고평가",
          finalMarketRegimeScoreBalanced: 31
        },
        rebalancingSummary: {
          increaseCandidates: ["삼성전자"]
        },
        holdings: [
          {
            name: "삼성전자",
            finalAction: "확대 검토",
            intrinsicValueScore: 71,
            priceTrendScore: 63,
            futureExpectationScore: 58,
            portfolioFitScore: 76,
            oneLineJudgment: "시장 부담은 있지만 선별적으로 볼 수 있습니다."
          }
        ]
      }
    });

    expect(result.reportText).toContain("- 비중 확대 검토: 삼성전자");
    expect(result.reportText).toContain("- 최종 의견: 확대 검토");
    expect(result.reportText).toContain("- 내재 가치: 양호");
    expect(result.reportText).toContain("- 구조 리스크: 과열");
  });

  it("completes with news brief sections when enrichment succeeds", async () => {
    const successfulMarketResults: MarketDataFetchResult[] = [
      {
        status: "ok",
        data: {
          itemCode: "NASDAQ",
          itemName: "나스닥 종합",
          source: "fred",
          sourceKey: "index:NASDAQ:IXIC",
          asOfDate: "2026-03-20",
          value: 18000
        }
      }
    ];
    const reportRunRepository = {
      startRun: vi.fn(async () => ({
        created: true,
        run: {
          id: "run-2",
          status: "running"
        }
      })),
      completeRun: vi.fn(async (input) => ({
        id: input.id,
        status: input.status,
        reportText: input.reportText,
        errorMessage: input.errorMessage
      }))
    };
    const successfulNewsBriefs: HoldingNewsBrief[] = [
      {
        holding: {
          companyName: "Apple Inc.",
          symbol: "AAPL",
          exchange: "US"
        },
        articles: [],
        events: [
          {
            confidence: "high",
            eventType: "product",
            headline: "신제품 공개",
            sentiment: "positive",
            summary: "수요 기대가 커지고 있습니다.",
            supportingArticleIds: ["a1"]
          }
        ],
        status: "ok"
      }
    ];
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async () => successfulMarketResults)
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [
          {
            companyName: "Apple Inc.",
            symbol: "AAPL",
            exchange: "US"
          }
        ])
      },
      portfolioNewsBriefService: {
        generateBriefsForHoldings: vi.fn(async () => successfulNewsBriefs)
      },
      reportRunRepository,
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [
          {
            itemCode: "NASDAQ",
            itemName: "나스닥 종합",
            sourceKey: "index:NASDAQ:IXIC"
          }
        ])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-20",
      scheduleType: "daily-pre-market"
    });

    expect(result.status).toBe("completed");
    expect(result.portfolioNewsBriefs).toHaveLength(1);
    expect(result.reportText).toContain("3. 🧭 오늘의 판단 프레임");
    expect(result.reportText).toContain("5. 🎯 포트폴리오 리밸런싱 제안");
    expect(result.reportText).toContain("[Apple Inc.]");
    expect(result.reportText).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });

  it("falls back to rule-based market, macro, risk, and link sections when composition is unavailable", async () => {
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
          changePercent: -2.0057,
          changeValue: -443.0782
        }
      },
      {
        status: "ok",
        data: {
          itemCode: "SP500",
          itemName: "S&P 500",
          source: "yahoo_finance",
          sourceKey: "index:SP:SPX",
          asOfDate: "2026-03-20",
          previousValue: 6606.4902,
          value: 6506.48,
          changePercent: -1.5138,
          changeValue: -100.0102
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
          changePercent: 11.3051,
          changeValue: 2.72
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
          previousValue: 119.8227,
          value: 120.5518,
          changePercent: 0.6085,
          changeValue: 0.7291
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
          changePercent: 0.4739,
          changeValue: 7.07
        }
      }
    ];
    const reportRunRepository = {
      startRun: vi.fn(async () => ({
        created: true,
        run: {
          id: "run-fallback",
          status: "running"
        }
      })),
      completeRun: vi.fn(async (input) => ({
        id: input.id,
        status: input.status,
        reportText: input.reportText,
        errorMessage: input.errorMessage
      }))
    };
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async () => marketResults)
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [])
      },
      publicBriefingBaseUrl: "https://example.com",
      publicReportRepository: {
        findLatestByReportDateAndSession: vi.fn(async () => ({
          id: "public-report-1"
        })),
        findLatestByReportDate: vi.fn(async () => ({
          id: "public-report-1"
        }))
      },
      reportRunRepository,
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [
          {
            itemCode: "NASDAQ",
            itemName: "나스닥 종합",
            sourceKey: "index:NASDAQ:IXIC"
          }
        ])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-20",
      scheduleType: "telegram-report"
    });

    expect(result.reportText).toContain("3. 🧭 오늘의 판단 프레임");
    expect(result.reportText).toContain("6. ⚠️ 오늘 반드시 볼 리스크");
    expect(result.reportText).toContain("7. 🔎 참고용 공개 프리마켓 브리핑");
    expect(result.reportText).toContain("https://example.com/reports/public-report-1");
    expect(result.publicBriefingLinked).toBe(true);
  });

  it("persists strategy snapshots for generated quant scorecards", async () => {
    const strategySnapshotRepository = {
      insertMany: vi.fn(async () => []),
      listByUserAndRunDateAndScheduleTypes: vi.fn(async () => [])
    };
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [
          {
            companyName: "삼성전자",
            symbol: "005930",
            exchange: "KR"
          }
        ])
      },
      reportRunRepository: {
        startRun: vi.fn(async () => ({
          created: true,
          run: {
            id: "run-3",
            status: "running"
          }
        })),
        completeRun: vi.fn(async (input) => ({
          id: input.id,
          status: input.status,
          reportText: input.reportText,
          errorMessage: input.errorMessage
        }))
      },
      strategySnapshotRepository,
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [])
      }
    });

    await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-21",
      scheduleType: "daily-pre-market"
    });

    expect(strategySnapshotRepository.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        reportRunId: "run-3",
        userId: "user-1",
        companyName: "삼성전자",
        exchange: "KR",
        symbol: "005930"
      })
    ]);
  });

  it("downgrades to partial success when strategy snapshot persistence fails", async () => {
    const reportRunRepository = {
      startRun: vi.fn(async () => ({
        created: true,
        run: {
          id: "run-4",
          status: "running"
        }
      })),
      completeRun: vi.fn(async (input) => ({
        id: input.id,
        status: input.status,
        reportText: input.reportText,
        errorMessage: input.errorMessage
      }))
    };
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [])
      },
      reportRunRepository,
      strategySnapshotRepository: {
        listByUserAndRunDateAndScheduleTypes: vi.fn(async () => []),
        insertMany: vi.fn(async () => {
          throw new Error("insert failed");
        })
      },
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-21",
      scheduleType: "daily-pre-market"
    });

    expect(result.status).toBe("partial_success");
    expect(reportRunRepository.completeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "partial_success",
        errorMessage: expect.stringContaining("strategy_snapshot: insert failed")
      })
    );
  });

  it("appends a public briefing link when a base url is configured", async () => {
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [])
      },
      publicBriefingBaseUrl: "https://jeongjibsa.github.io/stock-chatbot/",
      publicReportRepository: {
        findLatestByReportDateAndSession: vi.fn(async () => ({
          id: "report-2026-03-20"
        })),
        findLatestByReportDate: vi.fn(async () => ({
          id: "report-2026-03-20"
        }))
      },
      reportRunRepository: {
        startRun: vi.fn(async () => ({
          created: true,
          run: {
            id: "run-3",
            status: "running"
          }
        })),
        completeRun: vi.fn(async (input) => ({
          id: input.id,
          status: input.status,
          reportText: input.reportText,
          errorMessage: input.errorMessage
        }))
      },
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-20",
      scheduleType: "daily-pre-market"
    });

    expect(result.reportText).toContain(
      "https://jeongjibsa.github.io/stock-chatbot/reports/report-2026-03-20"
    );
    expect(result.publicBriefingLinked).toBe(true);
  });

  it("omits the public briefing section when a report row is missing", async () => {
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [])
      },
      publicBriefingBaseUrl: "https://web-three-tau-58.vercel.app/",
      publicReportRepository: {
        findLatestByReportDateAndSession: vi.fn(async () => null),
        findLatestByReportDate: vi.fn(async () => null)
      },
      reportRunRepository: {
        startRun: vi.fn(async () => ({
          created: true,
          run: {
            id: "run-4",
            status: "running"
          }
        })),
        completeRun: vi.fn(async (input) => ({
          id: input.id,
          status: input.status,
          reportText: input.reportText,
          errorMessage: input.errorMessage
        }))
      },
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-24",
      scheduleType: "telegram-report"
    });

    expect(result.reportText).not.toContain("/briefings/2026-03-24/");
    expect(result.reportText).not.toContain("참고용 공개 프리마켓 브리핑");
    expect(result.reportText).not.toContain("확인 필요");
    expect(result.publicBriefingLinked).toBe(false);
  });

  it("uses an explicit scheduled public briefing url without re-querying public reports", async () => {
    const publicReportRepository = {
      findLatestByReportDateAndSession: vi.fn(async () => ({
        id: "public-report-1"
      })),
      findLatestByReportDate: vi.fn(async () => ({
        id: "public-report-1"
      }))
    };
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async () => [])
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [])
      },
      publicBriefingBaseUrl: "https://web-three-tau-58.vercel.app",
      publicReportRepository,
      reportRunRepository: {
        startRun: vi.fn(async () => ({
          created: true,
          run: {
            id: "run-explicit-link",
            status: "running"
          }
        })),
        completeRun: vi.fn(async (input) => ({
          id: input.id,
          status: input.status,
          reportText: input.reportText,
          errorMessage: input.errorMessage
        }))
      },
      userMarketWatchRepository: {
        listEffectiveByUserId: vi.fn(async () => [])
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      publicBriefingUrl:
        "https://web-three-tau-58.vercel.app/reports/report-2026-03-24",
      runDate: "2026-03-24",
      scheduleType: "daily-pre-market"
    });

    expect(result.reportText).toContain(
      "https://web-three-tau-58.vercel.app/reports/report-2026-03-24"
    );
    expect(result.publicBriefingLinked).toBe(true);
    expect(publicReportRepository.findLatestByReportDateAndSession).not.toHaveBeenCalled();
    expect(publicReportRepository.findLatestByReportDate).not.toHaveBeenCalled();
  });

  it("uses the requested run date for rendering and snapshot lookup", async () => {
    const personalSnapshotRepository = {
      findByUserAndEffectiveDate: vi.fn(async () => ({
        payload: {
          selectedProfile: "balanced",
          rebalancingSummary: {
            increaseCandidates: ["삼성전자"]
          }
        }
      })),
      upsert: vi.fn(async () => ({})),
      deleteOlderThan: vi.fn(async () => 0)
    };
    const orchestrator = new DailyReportOrchestrator({
      marketDataAdapter: {
        fetchMany: vi.fn(async (): Promise<MarketDataFetchResult[]> => [
          {
            status: "ok",
            data: {
              itemCode: "KOSPI",
              itemName: "코스피",
              source: "yahoo_finance",
              sourceKey: "index:KRX:KOSPI",
              asOfDate: "2026-03-20",
              value: 2600
            }
          },
          {
            status: "ok",
            data: {
              itemCode: "NASDAQ",
              itemName: "나스닥 종합",
              source: "yahoo_finance",
              sourceKey: "index:NASDAQ:IXIC",
              asOfDate: "2026-03-21",
              value: 18000
            }
          }
        ])
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(async () => [])
      },
      defaultMarketItems: [
        {
          itemCode: "KOSPI",
          itemName: "코스피",
          sourceKey: "index:KRX:KOSPI"
        },
        {
          itemCode: "NASDAQ",
          itemName: "나스닥 종합",
          sourceKey: "index:NASDAQ:IXIC"
        }
      ],
      personalRebalancingSnapshotRepository: personalSnapshotRepository,
      reportRunRepository: {
        startRun: vi.fn(async () => ({
          created: true,
          run: {
            id: "run-effective-date",
            status: "running"
          }
        })),
        completeRun: vi.fn(async (input) => ({
          id: input.id,
          status: input.status,
          reportText: input.reportText,
          errorMessage: input.errorMessage
        }))
      }
    });

    const result = await orchestrator.runForUser({
      user: {
        id: "user-1",
        displayName: "Jisung"
      },
      runDate: "2026-03-22",
      scheduleType: "telegram-report"
    });

    expect(personalSnapshotRepository.findByUserAndEffectiveDate).toHaveBeenCalledWith({
      userId: "user-1",
      effectiveReportDate: "2026-03-22",
      snapshotVersion: "v2"
    });
    expect(result.reportText).toContain("오늘의 포트폴리오 프리마켓 브리핑 (2026-03-22)");
  });
});
