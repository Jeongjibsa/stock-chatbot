import { DAILY_REPORT_JOB_NAME, REPORT_QUEUE_NAME } from "@stock-chatbot/application";

export const PRE_MARKET_DAILY_REPORT_SCHEDULER_ID = "daily-report-pre-market";
export const POST_MARKET_DAILY_REPORT_SCHEDULER_ID = "daily-report-post-market";
export const DEFAULT_PRE_MARKET_REPORT_PATTERN = "0 30 7 * * 1-6";
export const DEFAULT_POST_MARKET_REPORT_PATTERN = "0 30 20 * * 1-5";
export const DEFAULT_REPORT_TIMEZONE = "Asia/Seoul";

type Environment = Record<string, string | undefined>;

type QueueSchedulerTemplateQueue = {
  upsertJobScheduler: (
    schedulerId: string,
    repeatOptions: Record<string, unknown>,
    template: Record<string, unknown>
  ) => Promise<unknown>;
};

export function readDailyReportPattern(
  env: Environment = process.env,
  briefingSession: "post_market" | "pre_market" = "pre_market"
): string {
  if (briefingSession === "post_market") {
    return env.POST_MARKET_REPORT_PATTERN ?? DEFAULT_POST_MARKET_REPORT_PATTERN;
  }

  return env.PRE_MARKET_REPORT_PATTERN ?? DEFAULT_PRE_MARKET_REPORT_PATTERN;
}

export function readReportTimezone(env: Environment = process.env): string {
  return env.REPORT_TIMEZONE ?? DEFAULT_REPORT_TIMEZONE;
}

export function readSchedulerEnabled(env: Environment = process.env): boolean {
  return env.ENABLE_DAILY_REPORT_SCHEDULER !== "false";
}

export async function scheduleDailyReportJob(
  queue: QueueSchedulerTemplateQueue,
  env: Environment = process.env
): Promise<void> {
  if (!readSchedulerEnabled(env)) {
    return;
  }

  await queue.upsertJobScheduler(
    PRE_MARKET_DAILY_REPORT_SCHEDULER_ID,
    {
      pattern: readDailyReportPattern(env, "pre_market"),
      tz: readReportTimezone(env)
    },
    {
      name: DAILY_REPORT_JOB_NAME,
      data: {
        briefingSession: "pre_market",
        source: "scheduler"
      },
      opts: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 30_000
        },
        removeOnComplete: 50,
        removeOnFail: 100
      }
    }
  );

  await queue.upsertJobScheduler(
    POST_MARKET_DAILY_REPORT_SCHEDULER_ID,
    {
      pattern: readDailyReportPattern(env, "post_market"),
      tz: readReportTimezone(env)
    },
    {
      name: DAILY_REPORT_JOB_NAME,
      data: {
        briefingSession: "post_market",
        source: "scheduler"
      },
      opts: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 30_000
        },
        removeOnComplete: 50,
        removeOnFail: 100
      }
    }
  );
}

export function getWorkerReadyMessage(): string {
  return `[worker] ready on queue ${REPORT_QUEUE_NAME}`;
}
