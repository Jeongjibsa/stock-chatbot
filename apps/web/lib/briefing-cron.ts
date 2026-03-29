import {
  isScheduledBriefingSessionAllowed,
  type BriefingSession,
  parseBriefingSession,
  resolveScheduledBriefingSession
} from "@stock-chatbot/application";
import {
  collectRetainedPublicCoverage,
  resolvePublicCoverageDatabaseUrl
} from "@stock-chatbot/worker/public-retention";
import { runDailyReport } from "@stock-chatbot/worker/run-daily-report";
import { runPublicBriefing } from "@stock-chatbot/worker/run-public-briefing";
import {
  readPublicBriefingRetentionStartDate,
  readPublicWeekReferenceDate
} from "@stock-chatbot/worker/public-week";

type TriggerType = "schedule" | "workflow_dispatch";
type PublicBriefingResult = Awaited<ReturnType<typeof runPublicBriefing>>;

const PUBLIC_BRIEFING_RETRY_DELAYS_MS = [10_000, 20_000] as const;

export function readCronRuntimeEnvironment(publicBriefingBaseUrl: string) {
  return {
    CRON_SECRET: process.env.CRON_SECRET,
    DAILY_REPORT_WINDOW_MINUTES: process.env.DAILY_REPORT_WINDOW_MINUTES,
    DATABASE_URL: process.env.DATABASE_URL,
    FRED_API_KEY: process.env.FRED_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PUBLIC_BRIEFING_BASE_URL:
      process.env.PUBLIC_BRIEFING_BASE_URL || publicBriefingBaseUrl,
    REDIS_URL: process.env.REDIS_URL,
    REPORT_TIMEZONE: process.env.REPORT_TIMEZONE,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL
  };
}

export async function runBriefingSession(input: {
  briefingSession: BriefingSession;
  reportRunDate?: string | null;
  runtimeEnv: ReturnType<typeof readCronRuntimeEnvironment>;
  triggerType: TriggerType;
},
dependencies: {
  repairRetainedPublicCoverageImpl?: typeof repairRetainedPublicCoverage;
  runDailyReportImpl?: typeof runDailyReport;
  runPublicBriefingImpl?: typeof runPublicBriefing;
  sleep?: (ms: number) => Promise<void>;
} = {}) {
  if (
    input.triggerType === "schedule" &&
    !isScheduledBriefingSessionAllowed(input.briefingSession, {
      timeZone: input.runtimeEnv.REPORT_TIMEZONE ?? "Asia/Seoul"
    })
  ) {
    return {
      skipped: true,
      briefingSession: input.briefingSession,
      reason: "session_not_allowed_for_today"
    };
  }

  const env = {
    ...input.runtimeEnv,
    BRIEFING_SESSION: input.briefingSession,
    REPORT_TRIGGER_TYPE: input.triggerType,
    ...(input.reportRunDate?.trim()
      ? { REPORT_RUN_DATE: input.reportRunDate.trim() }
      : {})
  };

  const publicBriefing = await runPublicBriefingWithRetry(env, {
    runPublicBriefingImpl: dependencies.runPublicBriefingImpl ?? runPublicBriefing,
    sleep: dependencies.sleep ?? delay
  });
  const retentionRepair = await (
    dependencies.repairRetainedPublicCoverageImpl ?? repairRetainedPublicCoverage
  )(env, {
    runPublicBriefingImpl: dependencies.runPublicBriefingImpl ?? runPublicBriefing
  });

  if (input.briefingSession === "weekend_briefing") {
    return {
      skipped: false,
      briefingSession: input.briefingSession,
      linkAttachedToDaily: false,
      publicBriefing,
      retentionRepair
    };
  }

  const summary = await (dependencies.runDailyReportImpl ?? runDailyReport)(env, {
    briefingSession: input.briefingSession,
    ...(publicBriefing.publicBriefingUrl
      ? { publicBriefingUrl: publicBriefing.publicBriefingUrl }
      : {}),
    ...(input.reportRunDate?.trim() ? { runDate: input.reportRunDate.trim() } : {})
  });

  return {
    skipped: false,
    briefingSession: input.briefingSession,
    linkAttachedToDaily: Boolean(publicBriefing.publicBriefingUrl),
    retentionRepair,
    summary,
    publicBriefing
  };
}

async function runPublicBriefingWithRetry(
  env: ReturnType<typeof readCronRuntimeEnvironment> & {
    BRIEFING_SESSION: BriefingSession;
    REPORT_RUN_DATE?: string;
    REPORT_TRIGGER_TYPE: TriggerType;
  },
  dependencies: {
    runPublicBriefingImpl: typeof runPublicBriefing;
    sleep: (ms: number) => Promise<void>;
  }
): Promise<
  (PublicBriefingResult & {
    retryCount: number;
  }) | {
    briefingSession: BriefingSession;
    errorMessage?: string;
    outputPath: string;
    persistedReportId?: string;
    publicBriefingUrl?: string;
    retryCount: number;
    runDate: string;
    snapshotCount: number;
    status: "failed";
  }
> {
  let retryCount = 0;
  let lastError: unknown;
  let lastResult: PublicBriefingResult | undefined;

  for (let attempt = 0; attempt <= PUBLIC_BRIEFING_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const result = await dependencies.runPublicBriefingImpl(env);

      if (result.status === "completed") {
        return {
          ...result,
          retryCount
        };
      }

      lastResult = result;
    } catch (error) {
      lastError = error;
      lastResult = undefined;
    }

    if (attempt === PUBLIC_BRIEFING_RETRY_DELAYS_MS.length) {
      break;
    }

    const waitMs = PUBLIC_BRIEFING_RETRY_DELAYS_MS[attempt];

    if (waitMs === undefined) {
      break;
    }

    retryCount += 1;
    await dependencies.sleep(waitMs);
  }

  if (lastResult) {
    return {
      ...lastResult,
      retryCount
    };
  }

  return {
    briefingSession: env.BRIEFING_SESSION,
    ...(lastError instanceof Error ? { errorMessage: lastError.message } : {}),
    outputPath: "",
    retryCount,
    runDate: env.REPORT_RUN_DATE ?? "",
    snapshotCount: 0,
    status: "failed"
  };
}

async function repairRetainedPublicCoverage(
  env: ReturnType<typeof readCronRuntimeEnvironment> & {
    BRIEFING_SESSION: BriefingSession;
    REPORT_RUN_DATE?: string;
    REPORT_TRIGGER_TYPE: TriggerType;
  },
  dependencies: {
    runPublicBriefingImpl: typeof runPublicBriefing;
  }
) {
  if (!resolvePublicCoverageDatabaseUrl({ DATABASE_URL: env.DATABASE_URL })) {
    return {
      checked: false,
      missingCount: 0,
      referenceDate: readPublicWeekReferenceDate({
        ...(env.REPORT_RUN_DATE ? { PUBLIC_WEEK_REFERENCE_DATE: env.REPORT_RUN_DATE } : {})
      }),
      repairedCount: 0,
      retentionStartDate: readPublicBriefingRetentionStartDate()
    };
  }

  const coverage = await collectRetainedPublicCoverage({
    DATABASE_URL: env.DATABASE_URL,
    ...(env.REPORT_RUN_DATE ? { PUBLIC_WEEK_REFERENCE_DATE: env.REPORT_RUN_DATE } : {})
  });

  for (const missingSession of coverage.missingSessions) {
    await dependencies.runPublicBriefingImpl({
      ...env,
      BRIEFING_SESSION: missingSession.briefingSession,
      REPORT_RUN_DATE: missingSession.reportDate
    });
  }

  return {
    checked: true,
    missingCount: coverage.missingSessions.length,
    referenceDate: coverage.referenceDate,
    repairedCount: coverage.missingSessions.length,
    retentionStartDate: coverage.retentionStartDate
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resolveRequestedBriefingSessions(input: {
  briefingSessionParam?: string | null;
  now?: Date;
  timeZone?: string;
}): BriefingSession[] {
  const parsed = parseBriefingSession(input.briefingSessionParam);

  if (parsed) {
    return [parsed];
  }

  if (input.briefingSessionParam === "both") {
    return ["pre_market", "post_market"];
  }

  const resolved = resolveScheduledBriefingSession({
    timeZone: input.timeZone ?? "Asia/Seoul",
    ...(input.now ? { now: input.now } : {})
  });

  return resolved === "none" ? [] : [resolved];
}
