import { describe, expect, it, vi } from "vitest";

import { getAdminDashboardSnapshot, mapAdminSummaryRow } from "./admin-dashboard";
import * as dbModule from "./db";

describe("admin-dashboard", () => {
  it("maps admin summary row counts to numbers", () => {
    expect(
      mapAdminSummaryRow({
        completed_count: "4",
        failed_count: "1",
        partial_success_count: "2",
        running_count: "0",
        total_count: "7"
      })
    ).toEqual({
      completedCount: 4,
      failedCount: 1,
      partialSuccessCount: 2,
      runningCount: 0,
      totalCount: 7
    });
  });

  it("normalizes Postgres date columns to yyyy-mm-dd strings", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: "report-1",
            report_date: new Date("2026-03-22T00:00:00.000Z"),
            briefing_session: "pre_market",
            summary: "요약",
            market_regime: "Neutral",
            total_score: "0.00",
            created_at: new Date("2026-03-22T00:10:00.000Z")
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "run-1",
            run_date: new Date("2026-03-22T00:00:00.000Z"),
            schedule_type: "telegram-report",
            status: "completed",
            started_at: new Date("2026-03-22T00:10:00.000Z"),
            completed_at: new Date("2026-03-22T00:11:00.000Z"),
            error_message: null,
            display_name: "Jisung Jung"
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            completed_count: "1",
            failed_count: "0",
            partial_success_count: "0",
            running_count: "0",
            total_count: "1"
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [{ report_count: "1" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "snapshot-1",
            run_date: new Date("2026-03-22T00:00:00.000Z"),
            company_name: "시장 기준",
            symbol: null,
            exchange: null,
            action: "HOLD",
            total_score: "0.00",
            created_at: new Date("2026-03-22T00:10:00.000Z"),
            display_name: "Jisung Jung"
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            telegram_user_id: "8606362482",
            display_name: "Jisung Jung",
            is_registered: true,
            is_blocked: false,
            blocked_reason: null,
            blocked_at: null,
            unregistered_at: null,
            daily_report_requests_today: "1",
            daily_portfolio_requests_today: "2",
            last_request_at: new Date("2026-03-22T01:00:00.000Z")
          }
        ]
      });

    vi.spyOn(dbModule, "getWebPool").mockReturnValue({
      query
    } as unknown as ReturnType<typeof dbModule.getWebPool>);

    const snapshot = await getAdminDashboardSnapshot();

    expect(snapshot.latestReport?.reportDate).toBe("2026-03-22");
    expect(snapshot.recentRuns[0]?.runDate).toBe("2026-03-22");
    expect(snapshot.recentStrategySnapshots[0]?.runDate).toBe("2026-03-22");
    expect(snapshot.users[0]).toEqual({
      telegramUserId: "8606362482",
      displayName: "Jisung Jung",
      isRegistered: true,
      isBlocked: false,
      blockedReason: null,
      blockedAt: null,
      unregisteredAt: null,
      dailyReportRequestsToday: 1,
      dailyPortfolioRequestsToday: 2,
      lastRequestAt: "2026-03-22T01:00:00.000Z"
    });
  });
});
