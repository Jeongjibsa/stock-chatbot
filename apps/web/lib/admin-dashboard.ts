import type {
  AdminDashboardSnapshot,
  AdminDashboardSummary,
  AdminRecentPublicReport,
  AdminRecentRun
} from "../types/admin";
import { getWebPool } from "./db";

type AdminSummaryRow = {
  completed_count: string;
  failed_count: string;
  partial_success_count: string;
  running_count: string;
  total_count: string;
};

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
  const [latestReportResult, recentReportsResult, recentRunsResult, runSummaryResult, reportsLast7DaysResult] =
    await Promise.all([
      pool.query<{
        created_at: Date;
        id: string;
        market_regime: string;
        report_date: string;
        summary: string;
        total_score: string;
      }>(
        [
          'SELECT "id", "report_date", "summary", "market_regime", "total_score", "created_at"',
          'FROM "reports"',
          'ORDER BY "report_date" DESC, "created_at" DESC',
          "LIMIT 1"
        ].join(" ")
      ),
      pool.query<{
        created_at: Date;
        id: string;
        market_regime: string;
        report_date: string;
        summary: string;
        total_score: string;
      }>(
        [
          'SELECT "id", "report_date", "summary", "market_regime", "total_score", "created_at"',
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
        run_date: string;
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
      )
    ]);

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
    )
  };
}

function mapRecentPublicReport(report: {
  created_at: Date;
  id: string;
  market_regime: string;
  report_date: string;
  summary: string;
  total_score: string;
}): AdminRecentPublicReport {
  return {
    id: report.id,
    reportDate: report.report_date,
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
  run_date: string;
  schedule_type: string;
  started_at: Date;
  status: "completed" | "failed" | "partial_success" | "running";
}): AdminRecentRun {
  return {
    id: run.id,
    displayName: run.display_name,
    runDate: run.run_date,
    scheduleType: run.schedule_type,
    status: run.status,
    startedAt: run.started_at.toISOString(),
    completedAt: run.completed_at?.toISOString() ?? null,
    errorMessage: run.error_message
  };
}
