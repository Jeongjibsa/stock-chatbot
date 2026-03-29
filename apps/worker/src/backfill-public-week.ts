import "dotenv/config";

import { runPublicBriefing } from "./run-public-briefing.js";
import {
  collectRetainedPublicCoverage,
  resolvePublicCoverageDatabaseUrl
} from "./public-retention.js";
import {
  buildPublicRecoverySessions,
  readPublicBriefingRecoveryWindowDays,
  readPublicWeekReferenceDate
} from "./public-week.js";

async function main() {
  const referenceDate = readPublicWeekReferenceDate();
  const recoveryWindowDays = readPublicBriefingRecoveryWindowDays();
  const env = {
    ...process.env,
    DISABLE_UPSTASH_NEWS_CACHE:
      process.env.DISABLE_UPSTASH_NEWS_CACHE?.trim() || "true"
  };
  let sessions = buildPublicRecoverySessions(referenceDate, recoveryWindowDays);
  const publicBriefingBaseUrl = process.env.PUBLIC_BRIEFING_BASE_URL?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const useRuntimeBackfill = Boolean(publicBriefingBaseUrl && cronSecret);

  if (resolvePublicCoverageDatabaseUrl(env)) {
    const coverage = await collectRetainedPublicCoverage(env);

    sessions = coverage.missingSessions;

    console.log(
      [
        "[public-week-backfill]",
        `referenceDate=${coverage.referenceDate}`,
        `recoveryStartDate=${coverage.recoveryStartDate}`,
        `recoveryWindowDays=${coverage.recoveryWindowDays}`,
        `expectedCount=${coverage.expectedSessions.length}`,
        `missingCount=${coverage.missingSessions.length}`
      ].join(" ")
    );
  }

  if (sessions.length === 0) {
    console.log(
      [
        "[public-week-backfill]",
        `referenceDate=${referenceDate}`,
        `recoveryWindowDays=${recoveryWindowDays}`,
        "status=up_to_date"
      ].join(" ")
    );
    return;
  }

  for (const session of sessions) {
    if (useRuntimeBackfill && publicBriefingBaseUrl && cronSecret) {
      const result = await backfillViaRuntime({
        baseUrl: publicBriefingBaseUrl,
        briefingSession: session.briefingSession,
        cronSecret,
        reportRunDate: session.reportDate
      });

      console.log(
        [
          "[public-week-backfill]",
          `mode=runtime`,
          `recoveryWindowDays=${recoveryWindowDays}`,
          `date=${session.reportDate}`,
          `session=${session.briefingSession}`,
          `status=${result.status}`,
          ...(result.persistedReportId ? [`reportId=${result.persistedReportId}`] : []),
          ...(result.publicBriefingUrl ? [`url=${result.publicBriefingUrl}`] : [])
        ].join(" ")
      );

      continue;
    }

    const result = await runPublicBriefing({
      ...env,
      BRIEFING_SESSION: session.briefingSession,
      REPORT_RUN_DATE: session.reportDate
    });

    console.log(
      [
        "[public-week-backfill]",
        `mode=local`,
        `recoveryWindowDays=${recoveryWindowDays}`,
        `date=${session.reportDate}`,
        `session=${session.briefingSession}`,
        `status=${result.status}`,
        ...(result.persistedReportId ? [`reportId=${result.persistedReportId}`] : []),
        ...(result.publicBriefingUrl ? [`url=${result.publicBriefingUrl}`] : [])
      ].join(" ")
    );
  }
}

async function backfillViaRuntime(input: {
  baseUrl: string;
  briefingSession: string;
  cronSecret: string;
  reportRunDate: string;
}) {
  const url = new URL("/api/cron/public-backfill", input.baseUrl);
  url.searchParams.set("briefingSession", input.briefingSession);
  url.searchParams.set("reportRunDate", input.reportRunDate);

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${input.cronSecret}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache"
        }
      });
      const payload = (await response.json()) as {
        error?: string;
        ok?: boolean;
        readPathVerified?: boolean;
        result?: {
          persistedReportId?: string;
          publicBriefingUrl?: string;
          status?: string;
        };
      };

      if (!response.ok || !payload.ok || !payload.readPathVerified) {
        throw new Error(
          [
            `public-backfill failed`,
            `status=${response.status}`,
            `ok=${String(payload.ok)}`,
            `readPathVerified=${String(payload.readPathVerified)}`,
            ...(payload.error ? [`error=${payload.error}`] : [])
          ].join(" ")
        );
      }

      return {
        persistedReportId: payload.result?.persistedReportId,
        publicBriefingUrl: payload.result?.publicBriefingUrl,
        status: payload.result?.status ?? "success"
      };
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) => {
          setTimeout(resolve, 500 * attempt);
        });
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
