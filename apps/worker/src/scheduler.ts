import { DAILY_REPORT_JOB_NAME, REPORT_QUEUE_NAME } from "@stock-chatbot/application";

export const DAILY_REPORT_SCHEDULER_ID = "daily-report-8am";
export const DEFAULT_DAILY_REPORT_PATTERN = "0 0 8 * * *";
export const DEFAULT_REPORT_TIMEZONE = "Asia/Seoul";

type Environment = Record<string, string | undefined>;

type QueueSchedulerTemplateQueue = {
  upsertJobScheduler: (
    schedulerId: string,
    repeatOptions: Record<string, unknown>,
    template: Record<string, unknown>
  ) => Promise<unknown>;
};

export function readDailyReportPattern(env: Environment = process.env): string {
  return env.DAILY_REPORT_PATTERN ?? DEFAULT_DAILY_REPORT_PATTERN;
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
    DAILY_REPORT_SCHEDULER_ID,
    {
      pattern: readDailyReportPattern(env),
      tz: readReportTimezone(env)
    },
    {
      name: DAILY_REPORT_JOB_NAME,
      data: {
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
