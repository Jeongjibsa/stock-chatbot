import "dotenv/config";

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { normalizePostgresConnectionString } from "@stock-chatbot/database";

import {
  collectRetainedPublicCoverage,
  resolvePublicCoverageDatabaseUrl
} from "./public-retention.js";
import {
  buildPublicWeekSessions,
  readPublicBriefingRecoveryWindowDays,
  readPublicWeekReferenceDate
} from "./public-week.js";

const WORKER_SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(WORKER_SOURCE_DIR, "../../..");

export async function verifyPublicWeek(
  env: Record<string, string | undefined> = process.env
) {
  const databaseUrl = resolvePublicCoverageDatabaseUrl(env);
  const publicBriefingBaseUrl = env.PUBLIC_BRIEFING_BASE_URL?.trim()?.replace(/\/+$/, "");

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  if (!publicBriefingBaseUrl) {
    throw new Error("PUBLIC_BRIEFING_BASE_URL is missing");
  }

  const referenceDate = readPublicWeekReferenceDate(env);
  const recoveryWindowDays = readPublicBriefingRecoveryWindowDays(env);
  const expectedRecentSessions = buildPublicWeekSessions(referenceDate);
  const expectedRecentDates = [
    ...new Set(expectedRecentSessions.map((session) => session.reportDate))
  ];
  const coverage = await collectRetainedPublicCoverage({
    ...env,
    PUBLIC_WEEK_DATABASE_URL: databaseUrl
  });

  if (coverage.missingSessions.length > 0) {
    throw new Error(
      [
        `Public briefing recovery window is missing ${coverage.missingSessions.length} session(s)`,
        `start=${coverage.recoveryStartDate}`,
        `end=${coverage.referenceDate}`,
        `missing=${coverage.missingSessions
          .map((session) => `${session.reportDate}:${session.briefingSession}`)
          .join(", ")}`
      ].join(" ")
    );
  }

  const feedHtml = await readUrlWithRetry({
    expectedTokens: Array.from(
      new Set([coverage.recoveryStartDate, ...expectedRecentDates])
    ),
    label: "feed",
    url: publicBriefingBaseUrl
  });

  const detailIds = [...new Set(feedHtml.match(/\/reports\/([0-9a-f-]{36})/g) ?? [])].map(
    (value) => value.replace("/reports/", "")
  );

  if (detailIds.length < expectedRecentSessions.length) {
    throw new Error(
      `Public feed is missing recent report links: expected at least ${expectedRecentSessions.length}, received ${detailIds.length}`
    );
  }

  const requiredRoles = new Map([
    ["미장 마감 분석 기반 국장 시초가 예측", false],
    ["국장/대체거래소 결과 분석 및 미장 예보", false],
    ["미장 마감 분석 및 주간 이슈 총정리, 다음 주 일정 요약", false]
  ]);

  for (const reportId of detailIds.slice(0, Math.max(expectedRecentSessions.length, 12))) {
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
    databaseVisibleCount: coverage.availableCount,
    normalizedDatabaseUrl: normalizePostgresConnectionString(databaseUrl)
      .normalizedConnectionString,
    recentReportCount: expectedRecentSessions.length,
    recoveryStartDate: coverage.recoveryStartDate,
    recoveryWindowDays,
    referenceDate,
    recoveryReportCount: coverage.expectedSessions.length
  };
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

function readUrlWithVercelCurl(url: string) {
  const parsed = new URL(url);
  const relativePath = `${parsed.pathname}${parsed.search}`;

  return execFileSync(
    "vercel",
    ["curl", relativePath || "/", "--deployment", parsed.origin],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024
    }
  );
}

function shouldUseVercelCurlFallback(url: string, error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (!url.includes(".vercel.app")) {
    return false;
  }

  const message = error.message.toLowerCase();

  return message.includes("401") || message.includes("403");
}

async function readUrlWithRetry(input: {
  expectedTokens: string[];
  label: string;
  url: string;
}) {
  let lastHtml = "";

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      lastHtml = readUrlWithCurl(input.url);
    } catch (error) {
      if (!shouldUseVercelCurlFallback(input.url, error)) {
        throw error;
      }

      lastHtml = readUrlWithVercelCurl(input.url);
    }

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
      `recoveryStartDate=${result.recoveryStartDate}`,
      `recoveryWindowDays=${result.recoveryWindowDays}`,
      `recoveryReportCount=${result.recoveryReportCount}`,
      `recentReportCount=${result.recentReportCount}`,
      `checkedDetailCount=${result.checkedDetailCount}`,
      `databaseVisibleCount=${result.databaseVisibleCount}`
    ].join(" ")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
