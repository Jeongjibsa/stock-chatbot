import type {
  AdminDashboardSnapshot,
  AdminDashboardSummary,
  AdminRecentPublicReport,
  AdminRecentRun,
  AdminRecentStrategySnapshot,
  AdminUserSummary
} from "../types/admin";
import { getWebPool } from "./db";
import {
  evaluateStrategySnapshots,
  summarizeStrategySnapshots,
  type StrategyBacktestSnapshotInput
} from "./strategy-backtest";

type AdminSummaryRow = {
  completed_count: string;
  failed_count: string;
  partial_success_count: string;
  running_count: string;
  total_count: string;
};

function normalizeDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

export function mapAdminSummaryRow(row: AdminSummaryRow): AdminDashboardSummary {
  return {
    completedCount: Number.parseInt(row.completed_count, 10),
    failedCount: Number.parseInt(row.failed_count, 10),
    partialSuccessCount: Number.parseInt(row.partial_success_count, 10),
    runningCount: Number.parseInt(row.running_count, 10),
    totalCount: Number.parseInt(row.total_count, 10)
  };
}

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const pool = getWebPool();
  const [
    latestReportResult,
    recentReportsResult,
    recentRunsResult,
    runSummaryResult,
    reportsLast7DaysResult,
    recentStrategySnapshotsResult,
    userSummaryResult
  ] =
    await Promise.all([
      pool.query<{
        briefing_session: "post_market" | "pre_market";
        created_at: Date;
        id: string;
        market_regime: string;
        report_date: Date | string;
        summary: string;
        total_score: string;
      }>(
        [
          'SELECT "id", "report_date", "briefing_session", "summary", "market_regime", "total_score", "created_at"',
          'FROM "reports"',
          'ORDER BY "report_date" DESC, "created_at" DESC',
          "LIMIT 1"
        ].join(" ")
      ),
      pool.query<{
        briefing_session: "post_market" | "pre_market";
        created_at: Date;
        id: string;
        market_regime: string;
        report_date: Date | string;
        summary: string;
        total_score: string;
      }>(
        [
          'SELECT "id", "report_date", "briefing_session", "summary", "market_regime", "total_score", "created_at"',
          'FROM "reports"',
          'ORDER BY "report_date" DESC, "created_at" DESC',
          "LIMIT 6"
        ].join(" ")
      ),
      pool.query<{
        completed_at: Date | null;
        display_name: string;
        error_message: string | null;
        id: string;
        run_date: Date | string;
        schedule_type: string;
        started_at: Date;
        status: "completed" | "failed" | "partial_success" | "running";
      }>(
        [
          'SELECT rr."id", rr."run_date", rr."schedule_type", rr."status", rr."started_at", rr."completed_at", rr."error_message", u."display_name"',
          'FROM "report_runs" rr',
          'JOIN "users" u ON u."id" = rr."user_id"',
          'ORDER BY rr."started_at" DESC',
          "LIMIT 12"
        ].join(" ")
      ),
      pool.query<AdminSummaryRow>(
        [
          "SELECT",
          `COUNT(*) FILTER (WHERE "status" = 'completed')::text AS completed_count,`,
          `COUNT(*) FILTER (WHERE "status" = 'failed')::text AS failed_count,`,
          `COUNT(*) FILTER (WHERE "status" = 'partial_success')::text AS partial_success_count,`,
          `COUNT(*) FILTER (WHERE "status" = 'running')::text AS running_count,`,
          `COUNT(*)::text AS total_count`,
          'FROM "report_runs"',
          `WHERE "started_at" >= NOW() - INTERVAL '24 hours'`
        ].join(" ")
      ),
      pool.query<{ report_count: string }>(
        [
          `SELECT COUNT(*)::text AS report_count`,
          'FROM "reports"',
          `WHERE "created_at" >= NOW() - INTERVAL '7 days'`
        ].join(" ")
      ),
      pool.query<{
        action: "ACCUMULATE" | "DEFENSIVE" | "HOLD" | "REDUCE";
        company_name: string;
        created_at: Date;
        display_name: string;
        exchange: string | null;
        id: string;
        run_date: Date | string;
        symbol: string | null;
        total_score: string;
      }>(
        [
          'SELECT ss."id", ss."run_date", ss."company_name", ss."symbol", ss."exchange", ss."action", ss."total_score", ss."created_at", u."display_name"',
          'FROM "strategy_snapshots" ss',
          'JOIN "users" u ON u."id" = ss."user_id"',
          'ORDER BY ss."run_date" DESC, ss."created_at" DESC',
          "LIMIT 12"
        ].join(" ")
      ),
      pool.query<{
        blocked_at: Date | null;
        blocked_reason: "flood" | "manual" | null;
        daily_portfolio_requests_today: string;
        daily_report_requests_today: string;
        display_name: string;
        is_blocked: boolean;
        is_registered: boolean;
        last_request_at: Date | null;
        telegram_user_id: string;
        unregistered_at: Date | null;
      }>(
        [
          "SELECT",
          'u."telegram_user_id",',
          'u."display_name",',
          'u."is_registered",',
          'u."is_blocked",',
          'u."blocked_reason",',
          'u."blocked_at",',
          'u."unregistered_at",',
          `COUNT(*) FILTER (WHERE tre."event_kind" = 'report_request' AND timezone('Asia/Seoul', tre."created_at")::date = timezone('Asia/Seoul', now())::date)::text AS daily_report_requests_today,`,
          `COUNT(*) FILTER (WHERE tre."event_kind" = 'portfolio_request' AND timezone('Asia/Seoul', tre."created_at")::date = timezone('Asia/Seoul', now())::date)::text AS daily_portfolio_requests_today,`,
          'MAX(tre."created_at") AS last_request_at',
          'FROM "users" u',
          'LEFT JOIN "telegram_request_events" tre ON tre."telegram_user_id" = u."telegram_user_id"',
          'GROUP BY u."telegram_user_id", u."display_name", u."is_registered", u."is_blocked", u."blocked_reason", u."blocked_at", u."unregistered_at", u."updated_at"',
          'ORDER BY u."is_blocked" DESC, u."is_registered" DESC, u."updated_at" DESC',
          "LIMIT 30"
        ].join(" ")
      )
    ]);
  const evaluatedStrategySnapshots = await evaluateStrategySnapshots({
    snapshots: recentStrategySnapshotsResult.rows.map(mapStrategySnapshotInput)
  });

  return {
    latestReport: latestReportResult.rows[0]
      ? mapRecentPublicReport(latestReportResult.rows[0])
      : null,
    recentReports: recentReportsResult.rows.map(mapRecentPublicReport),
    recentRuns: recentRunsResult.rows.map(mapRecentRun),
    runSummary24h: mapAdminSummaryRow(
      runSummaryResult.rows[0] ?? {
        completed_count: "0",
        failed_count: "0",
        partial_success_count: "0",
        running_count: "0",
        total_count: "0"
      }
    ),
    reportsLast7Days: Number.parseInt(
      reportsLast7DaysResult.rows[0]?.report_count ?? "0",
      10
    ),
    users: userSummaryResult.rows.map(mapAdminUserSummary),
    recentStrategySnapshots: evaluatedStrategySnapshots.map(mapRecentStrategySnapshot),
    strategyBacktestSummary: summarizeStrategySnapshots(evaluatedStrategySnapshots)
  };
}

function mapRecentPublicReport(report: {
  briefing_session: "post_market" | "pre_market";
  created_at: Date;
  id: string;
  market_regime: string;
  report_date: Date | string;
  summary: string;
  total_score: string;
}): AdminRecentPublicReport {
  return {
    briefingSession: report.briefing_session,
    id: report.id,
    reportDate: normalizeDateOnly(report.report_date),
    summary: report.summary,
    marketRegime: report.market_regime,
    totalScore: Number.parseFloat(report.total_score),
    createdAt: report.created_at.toISOString()
  };
}

function mapRecentRun(run: {
  completed_at: Date | null;
  display_name: string;
  error_message: string | null;
  id: string;
  run_date: Date | string;
  schedule_type: string;
  started_at: Date;
  status: "completed" | "failed" | "partial_success" | "running";
}): AdminRecentRun {
  return {
    id: run.id,
    displayName: run.display_name,
    runDate: normalizeDateOnly(run.run_date),
    scheduleType: run.schedule_type,
    status: run.status,
    startedAt: run.started_at.toISOString(),
    completedAt: run.completed_at?.toISOString() ?? null,
    errorMessage: run.error_message
  };
}

function mapStrategySnapshotInput(snapshot: {
  action: "ACCUMULATE" | "DEFENSIVE" | "HOLD" | "REDUCE";
  company_name: string;
  created_at: Date;
  display_name: string;
  exchange: string | null;
  id: string;
  run_date: Date | string;
  symbol: string | null;
  total_score: string;
}): StrategyBacktestSnapshotInput & { createdAt: string; displayName: string } {
  return {
    id: snapshot.id,
    runDate: normalizeDateOnly(snapshot.run_date),
    companyName: snapshot.company_name,
    symbol: snapshot.symbol,
    exchange: snapshot.exchange,
    action: snapshot.action,
    totalScore: Number.parseFloat(snapshot.total_score),
    createdAt: snapshot.created_at.toISOString(),
    displayName: snapshot.display_name
  };
}

function mapRecentStrategySnapshot(
  snapshot: ReturnType<typeof mapStrategySnapshotInput> & {
    outcome: "loss" | "neutral" | "unavailable" | "win";
    realizedReturnPct: number | null;
  }
): AdminRecentStrategySnapshot {
  return {
    id: snapshot.id,
    runDate: snapshot.runDate,
    companyName: snapshot.companyName,
    symbol: snapshot.symbol,
    exchange: snapshot.exchange,
    action: snapshot.action,
    totalScore: snapshot.totalScore,
    createdAt: snapshot.createdAt,
    displayName: snapshot.displayName,
    realizedReturnPct: snapshot.realizedReturnPct,
    outcome: snapshot.outcome
  };
}

function mapAdminUserSummary(user: {
  blocked_at: Date | null;
  blocked_reason: "flood" | "manual" | null;
  daily_portfolio_requests_today: string;
  daily_report_requests_today: string;
  display_name: string;
  is_blocked: boolean;
  is_registered: boolean;
  last_request_at: Date | null;
  telegram_user_id: string;
  unregistered_at: Date | null;
}): AdminUserSummary {
  return {
    telegramUserId: user.telegram_user_id,
    displayName: user.display_name,
    isRegistered: user.is_registered,
    isBlocked: user.is_blocked,
    blockedReason: user.blocked_reason,
    blockedAt: user.blocked_at?.toISOString() ?? null,
    unregisteredAt: user.unregistered_at?.toISOString() ?? null,
    dailyReportRequestsToday: Number.parseInt(user.daily_report_requests_today, 10),
    dailyPortfolioRequestsToday: Number.parseInt(
      user.daily_portfolio_requests_today,
      10
    ),
    lastRequestAt: user.last_request_at?.toISOString() ?? null
  };
}
