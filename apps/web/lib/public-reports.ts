import type { PublicReport } from "../types/report";
import { getWebPool } from "./db";

export async function listPublicReports(): Promise<PublicReport[]> {
  const pool = getWebPool();
  const result = await pool.query<{
    content_markdown: string;
    created_at: Date;
    id: string;
    market_regime: string;
    report_date: string;
    signals: string[];
    summary: string;
    total_score: string;
  }>(
    [
      'SELECT "id", "report_date", "summary", "market_regime", "total_score", "signals", "content_markdown", "created_at"',
      'FROM "reports"',
      'ORDER BY "report_date" DESC, "created_at" DESC'
    ].join(" ")
  );

  return result.rows.map(mapRowToPublicReport);
}

export async function getPublicReportById(
  id: string
): Promise<PublicReport | null> {
  const pool = getWebPool();
  const result = await pool.query<{
    content_markdown: string;
    created_at: Date;
    id: string;
    market_regime: string;
    report_date: string;
    signals: string[];
    summary: string;
    total_score: string;
  }>(
    [
      'SELECT "id", "report_date", "summary", "market_regime", "total_score", "signals", "content_markdown", "created_at"',
      'FROM "reports"',
      'WHERE "id" = $1',
      'LIMIT 1'
    ].join(" "),
    [id]
  );

  return result.rows[0] ? mapRowToPublicReport(result.rows[0]) : null;
}

function mapRowToPublicReport(report: {
  content_markdown: string;
  created_at: Date;
  id: string;
  market_regime: string;
  report_date: string;
  signals: string[];
  summary: string;
  total_score: string;
}): PublicReport {
  return {
    id: report.id,
    reportDate: report.report_date,
    summary: report.summary,
    marketRegime: report.market_regime,
    totalScore: Number.parseFloat(report.total_score),
    signals: report.signals,
    contentMarkdown: report.content_markdown,
    createdAt: report.created_at.toISOString()
  };
}
