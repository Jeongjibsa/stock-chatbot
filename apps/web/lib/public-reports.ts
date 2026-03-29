import { unstable_noStore as noStore } from "next/cache";

import type { BriefingSession } from "@stock-chatbot/application";

import type { PublicReport } from "../types/report";
import { getWebPool } from "./db";

export async function listPublicReports(): Promise<PublicReport[]> {
  noStore();
  const pool = getWebPool();
  try {
    const result = await pool.query<{
      content_markdown: string;
      created_at: Date;
      briefing_session: BriefingSession;
      id: string;
      indicator_tags: string[];
      market_regime: string;
      news_references: Array<{ sourceLabel: string; title: string; url: string }>;
      report_date: Date | string;
      signals: string[];
      summary: string;
      total_score: string;
    }>(
      [
        'SELECT "id", "report_date", "briefing_session", "summary", "market_regime", "total_score", "signals", "indicator_tags", "news_references", "content_markdown", "created_at"',
        'FROM "reports"',
        'ORDER BY "report_date" DESC, "briefing_session" ASC, "created_at" DESC'
      ].join(" ")
    );

    return result.rows.map(mapRowToPublicReport);
  } catch (error) {
    if (!isMissingIndicatorTagsError(error)) {
      throw error;
    }

    const legacyResult = await pool.query<{
      content_markdown: string;
      created_at: Date;
      briefing_session: BriefingSession;
      id: string;
      market_regime: string;
      news_references: Array<{ sourceLabel: string; title: string; url: string }>;
      report_date: Date | string;
      signals: string[];
      summary: string;
      total_score: string;
    }>(
      [
        `SELECT DISTINCT ON ("report_date") "id", "report_date", 'pre_market'::text AS "briefing_session", "summary", "market_regime", "total_score", "signals", "content_markdown", "created_at"`,
        'FROM "reports"',
        'ORDER BY "report_date" DESC, "created_at" DESC'
      ].join(" ")
    );

    return legacyResult.rows.map((row) =>
      mapRowToPublicReport({
        ...row,
        indicator_tags: [],
        news_references: []
      })
    );
  }
}

export async function getPublicReportById(
  id: string
): Promise<PublicReport | null> {
  noStore();
  const pool = getWebPool();
  try {
    const result = await pool.query<{
      content_markdown: string;
      created_at: Date;
      briefing_session: BriefingSession;
      id: string;
      indicator_tags: string[];
      market_regime: string;
      news_references: Array<{ sourceLabel: string; title: string; url: string }>;
      report_date: Date | string;
      signals: string[];
      summary: string;
      total_score: string;
    }>(
      [
        'SELECT "id", "report_date", "briefing_session", "summary", "market_regime", "total_score", "signals", "indicator_tags", "news_references", "content_markdown", "created_at"',
        'FROM "reports"',
        'WHERE "id" = $1',
        'LIMIT 1'
      ].join(" "),
      [id]
    );

    return result.rows[0] ? mapRowToPublicReport(result.rows[0]) : null;
  } catch (error) {
    if (!isMissingIndicatorTagsError(error)) {
      throw error;
    }

    const legacyResult = await pool.query<{
      content_markdown: string;
      created_at: Date;
      briefing_session: BriefingSession;
      id: string;
      market_regime: string;
      news_references: Array<{ sourceLabel: string; title: string; url: string }>;
      report_date: Date | string;
      signals: string[];
      summary: string;
      total_score: string;
    }>(
      [
        `SELECT "id", "report_date", 'pre_market'::text AS "briefing_session", "summary", "market_regime", "total_score", "signals", "content_markdown", "created_at"`,
        'FROM "reports"',
        'WHERE "id" = $1',
        'LIMIT 1'
      ].join(" "),
      [id]
    );

    return legacyResult.rows[0]
      ? mapRowToPublicReport({
          ...legacyResult.rows[0],
          indicator_tags: [],
          news_references: []
        })
      : null;
  }
}

function mapRowToPublicReport(report: {
  content_markdown: string;
  created_at: Date;
  briefing_session: BriefingSession;
  id: string;
  indicator_tags: string[];
  market_regime: string;
  news_references: Array<{ sourceLabel: string; title: string; url: string }>;
  report_date: Date | string;
  signals: string[];
  summary: string;
  total_score: string;
}): PublicReport {
  return {
    briefingSession: report.briefing_session ?? "pre_market",
    id: report.id,
    reportDate: normalizeDate(report.report_date),
    summary: report.summary,
    indicatorTags: report.indicator_tags ?? [],
    newsReferences: report.news_references ?? [],
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

function isMissingIndicatorTagsError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    code === "42703" ||
    message.includes('column "indicator_tags" does not exist') ||
    message.includes('column "news_references" does not exist') ||
    message.includes('column "briefing_session" does not exist')
  );
}
