import { unstable_noStore as noStore } from "next/cache";

import type { PublicReport } from "../types/report";
import { getWebPool } from "./db";

export async function listPublicReports(): Promise<PublicReport[]> {
  noStore();
  const pool = getWebPool();
  const result = await pool.query<{
    content_markdown: string;
    created_at: Date;
    id: string;
    indicator_tags: string[];
    market_regime: string;
    report_date: Date | string;
    signals: string[];
    summary: string;
    total_score: string;
  }>(
    [
      'SELECT DISTINCT ON ("report_date") "id", "report_date", "summary", "market_regime", "total_score", "signals", "indicator_tags", "content_markdown", "created_at"',
      'FROM "reports"',
      'ORDER BY "report_date" DESC, "created_at" DESC'
    ].join(" ")
  );

  return result.rows.map(mapRowToPublicReport);
}

export async function getPublicReportById(
  id: string
): Promise<PublicReport | null> {
  noStore();
  const pool = getWebPool();
  const result = await pool.query<{
    content_markdown: string;
    created_at: Date;
    id: string;
    indicator_tags: string[];
    market_regime: string;
    report_date: Date | string;
    signals: string[];
    summary: string;
    total_score: string;
  }>(
    [
      'SELECT "id", "report_date", "summary", "market_regime", "total_score", "signals", "indicator_tags", "content_markdown", "created_at"',
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
  indicator_tags: string[];
  market_regime: string;
  report_date: Date | string;
  signals: string[];
  summary: string;
  total_score: string;
}): PublicReport {
  return {
    id: report.id,
    reportDate: normalizeDate(report.report_date),
    summary: report.summary,
    indicatorTags: report.indicator_tags ?? [],
    marketRegime: report.market_regime,
    totalScore: Number.parseFloat(report.total_score),
    signals: report.signals,
    contentMarkdown: report.content_markdown,
    createdAt: report.created_at.toISOString()
  };
}

function normalizeDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}
