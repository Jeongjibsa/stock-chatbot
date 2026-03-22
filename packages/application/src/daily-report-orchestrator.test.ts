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
      scheduleType: "daily-9am"
    });

    expect(result.status).toBe("partial_success");
    expect(result.reportText).toContain("📰 종목 관련 핵심 기사 및 이벤트 요약");
    expect(result.reportText).toContain("🧩 누락 또는 지연 항목");
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
      scheduleType: "daily-9am"
    });

    expect(result.status).toBe("skipped_duplicate");
    expect(result.reportText).toBe("existing report");
    expect(marketDataAdapter.fetchMany).not.toHaveBeenCalled();
    expect(reportRunRepository.completeRun).not.toHaveBeenCalled();
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
      scheduleType: "daily-9am"
    });

    expect(result.status).toBe("completed");
    expect(result.portfolioNewsBriefs).toHaveLength(1);
    expect(result.reportText).toContain("📰 종목 관련 핵심 기사 및 이벤트 요약");
    expect(result.reportText).toContain("🧠 퀀트 기반 시그널 및 매매 아이디어");
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

    expect(result.reportText).toContain("🌍 거시 시장 스냅샷");
    expect(result.reportText).toContain("📍 주요 지표 변동 요약");
    expect(result.reportText).toContain("🧭 시장, 매크로, 자금 브리핑");
    expect(result.reportText).toContain("⚠️ 리스크 체크리스트");
    expect(result.reportText).toContain("🔎 상세 브리핑: https://example.com/reports/public-report-1");
    expect(result.reportText).not.toContain("시장, 매크로, 자금 브리핑 데이터가 아직 충분하지 않습니다.");
  });

  it("persists strategy snapshots for generated quant scorecards", async () => {
    const strategySnapshotRepository = {
      insertMany: vi.fn(async () => [])
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
      scheduleType: "daily-9am"
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
      scheduleType: "daily-9am"
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
      scheduleType: "daily-9am"
    });

    expect(result.reportText).toContain(
      "🔎 상세 브리핑: https://jeongjibsa.github.io/stock-chatbot/reports/report-2026-03-20"
    );
  });
});
