import { createPool } from "@stock-chatbot/database";

import {
  buildRetainedPublicSessions,
  type PublicWeekSession,
  readPublicBriefingRetentionStartDate,
  readPublicWeekReferenceDate
} from "./public-week.js";

type StoredReportKey = {
  briefing_session: string;
  report_date: string;
};

export function resolvePublicCoverageDatabaseUrl(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  return (
    env.PUBLIC_WEEK_DATABASE_URL?.trim() ??
    env.TELEGRAM_E2E_DATABASE_URL?.trim() ??
    env.DATABASE_URL?.trim()
  );
}

export async function collectRetainedPublicCoverage(
  env: Record<string, string | undefined> = process.env
): Promise<{
  availableCount: number;
  expectedSessions: PublicWeekSession[];
  missingSessions: PublicWeekSession[];
  referenceDate: string;
  retentionStartDate: string;
}> {
  const databaseUrl = resolvePublicCoverageDatabaseUrl(env);

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  const referenceDate = readPublicWeekReferenceDate(env);
  const retentionStartDate = readPublicBriefingRetentionStartDate(env);
  const expectedSessions = buildRetainedPublicSessions(
    referenceDate,
    retentionStartDate
  );
  const pool = createPool(databaseUrl);

  try {
    const reportRows = await pool.query<StoredReportKey>(
      [
        'SELECT "report_date"::text AS "report_date", "briefing_session"',
        'FROM "reports"',
        'WHERE "report_date" >= $1 AND "report_date" <= $2'
      ].join(" "),
      [retentionStartDate, referenceDate]
    );
    const available = new Set(
      reportRows.rows.map((row) => `${row.report_date}:${row.briefing_session}`)
    );
    const missingSessions = expectedSessions.filter(
      (session) => !available.has(`${session.reportDate}:${session.briefingSession}`)
    );

    return {
      availableCount: reportRows.rows.length,
      expectedSessions,
      missingSessions,
      referenceDate,
      retentionStartDate
    };
  } finally {
    await pool.end();
  }
}
