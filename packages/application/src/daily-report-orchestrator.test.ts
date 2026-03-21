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
    expect(result.reportText).toContain("📰 종목 관련 핵심 기사 요약");
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
    expect(result.reportText).toContain("📰 종목 관련 핵심 기사 요약");
    expect(result.reportText).toContain("🧠 퀀트 기반 시그널 및 매매 아이디어");
    expect(result.reportText).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });
});
