import "dotenv/config";

import { execFileSync } from "node:child_process";

import {
  createPool,
  normalizePostgresConnectionString
} from "@stock-chatbot/database";

import { buildPublicWeekSessions, readPublicWeekReferenceDate } from "./public-week.js";

type StoredReport = {
  briefing_session: string;
  content_markdown: string;
  id: string;
  report_date: string;
};

export async function verifyPublicWeek(
  env: Record<string, string | undefined> = process.env
) {
  const databaseUrl =
    env.PUBLIC_WEEK_DATABASE_URL?.trim() ??
    env.TELEGRAM_E2E_DATABASE_URL?.trim() ??
    env.DATABASE_URL?.trim();
  const publicBriefingBaseUrl = env.PUBLIC_BRIEFING_BASE_URL?.trim()?.replace(/\/+$/, "");

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  if (!publicBriefingBaseUrl) {
    throw new Error("PUBLIC_BRIEFING_BASE_URL is missing");
  }

  const referenceDate = readPublicWeekReferenceDate(env);
  const expectedSessions = buildPublicWeekSessions(referenceDate);
  const uniqueDates = [...new Set(expectedSessions.map((session) => session.reportDate))];
  const pool = createPool(databaseUrl);

  try {
    const reportRows = await pool.query<StoredReport>(
      [
        'SELECT "id", "report_date"::text AS "report_date", "briefing_session", "content_markdown"',
        'FROM "reports"',
        'WHERE "report_date" >= $1 AND "report_date" <= $2',
        'ORDER BY "report_date" ASC, "briefing_session" ASC'
      ].join(" "),
      [expectedSessions[0]?.reportDate ?? referenceDate, referenceDate]
    );
    const available = new Map<string, StoredReport>(
      reportRows.rows.map((row) => [`${row.report_date}:${row.briefing_session}`, row] as const)
    );
    const missing = expectedSessions.filter(
      (session) => !available.has(`${session.reportDate}:${session.briefingSession}`)
    );
    if (missing.length > 0) {
      console.warn(
        "[public-week-verify] database query returned incomplete current-week rows, falling back to public feed/detail verification",
        missing.map((session) => `${session.reportDate}:${session.briefingSession}`).join(", ")
      );
    }

    const feedHtml = await readUrlWithRetry({
      expectedTokens: uniqueDates,
      label: "feed",
      url: publicBriefingBaseUrl
    });

    const detailIds = [...new Set(feedHtml.match(/\/reports\/([0-9a-f-]{36})/g) ?? [])].map(
      (value) => value.replace("/reports/", "")
    );

    if (detailIds.length < expectedSessions.length) {
      throw new Error(
        `Public feed is missing current-week report links: expected at least ${expectedSessions.length}, received ${detailIds.length}`
      );
    }

    const requiredRoles = new Map([
      ["미장 마감 분석 기반 국장 시초가 예측", false],
      ["국장/대체거래소 결과 분석 및 미장 예보", false],
      ["주간 이슈 총정리 및 다음 주 일정 요약", false]
    ]);

    for (const reportId of detailIds.slice(0, Math.max(expectedSessions.length, 12))) {
      const html = await readUrlWithRetry({
        expectedTokens: ["브리핑 역할"],
        label: `detail:${reportId}`,
        url: `${publicBriefingBaseUrl}/reports/${reportId}`
      });

      if (!html.includes("브리핑 역할")) {
        continue;
      }

      assertContains(html, "시장 종합 해석", `detail:${reportId}`);
      assertContains(html, "핵심 뉴스 이벤트", `detail:${reportId}`);
      assertContains(html, "거시 트렌드 뉴스", `detail:${reportId}`);
      assertContains(html, "참고한 뉴스 출처", `detail:${reportId}`);

      for (const role of requiredRoles.keys()) {
        if (html.includes(role)) {
          requiredRoles.set(role, true);
        }
      }

      if ([...requiredRoles.values()].every(Boolean)) {
        break;
      }
    }

    const missingRoles = [...requiredRoles.entries()]
      .filter(([, found]) => !found)
      .map(([role]) => role);

    if (missingRoles.length > 0) {
      throw new Error(`Public detail coverage is missing session roles: ${missingRoles.join(", ")}`);
    }

    return {
      checkedDetailCount: detailIds.length,
      databaseVisibleCount: reportRows.rows.length,
      normalizedDatabaseUrl: normalizePostgresConnectionString(databaseUrl)
        .normalizedConnectionString,
      reportCount: expectedSessions.length,
      referenceDate
    };
  } finally {
    await pool.end();
  }
}

function assertContains(html: string, token: string, sessionKey: string) {
  if (!html.includes(token)) {
    throw new Error(`Public page for ${sessionKey} is missing section: ${token}`);
  }
}

function readUrlWithCurl(url: string) {
  return execFileSync(
    "curl",
    [
      "-sSfL",
      "-H",
      "Cache-Control: no-cache",
      "-H",
      "Pragma: no-cache",
      url
    ],
    {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024
    }
  );
}

async function readUrlWithRetry(input: {
  expectedTokens: string[];
  label: string;
  url: string;
}) {
  let lastHtml = "";

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    lastHtml = readUrlWithCurl(input.url);
    const missing = input.expectedTokens.filter((token) => !lastHtml.includes(token));

    if (missing.length === 0) {
      return lastHtml;
    }

    if (attempt < 10) {
      await new Promise((resolve) => {
        setTimeout(resolve, Math.min(2000, 300 * attempt));
      });
    }
  }

  for (const token of input.expectedTokens) {
    assertContains(lastHtml, token, input.label);
  }

  return lastHtml;
}

async function main() {
  const result = await verifyPublicWeek();

  console.log(
    [
      "[public-week-verify]",
      `referenceDate=${result.referenceDate}`,
      `reportCount=${result.reportCount}`,
      `checkedDetailCount=${result.checkedDetailCount}`,
      `databaseVisibleCount=${result.databaseVisibleCount}`
    ].join(" ")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
