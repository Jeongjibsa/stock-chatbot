import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DAILY_REPORT_PATTERN,
  DEFAULT_REPORT_TIMEZONE,
  readDailyReportPattern,
  readReportTimezone,
  readSchedulerEnabled,
  scheduleDailyReportJob
} from "./scheduler.js";

describe("scheduler", () => {
  it("reads default schedule values", () => {
    expect(readDailyReportPattern({})).toBe(DEFAULT_DAILY_REPORT_PATTERN);
    expect(readReportTimezone({})).toBe(DEFAULT_REPORT_TIMEZONE);
    expect(readSchedulerEnabled({})).toBe(true);
  });

  it("honors explicit scheduler overrides", () => {
    expect(
      readDailyReportPattern({ DAILY_REPORT_PATTERN: "0 30 8 * * *" })
    ).toBe("0 30 8 * * *");
    expect(readReportTimezone({ REPORT_TIMEZONE: "UTC" })).toBe("UTC");
    expect(
      readSchedulerEnabled({ ENABLE_DAILY_REPORT_SCHEDULER: "false" })
    ).toBe(false);
  });

  it("upserts the daily report scheduler with BullMQ template options", async () => {
    const upsertJobScheduler = vi.fn(async () => undefined);

    await scheduleDailyReportJob(
      {
        upsertJobScheduler
      },
      {
        DAILY_REPORT_PATTERN: "0 15 9 * * *",
        REPORT_TIMEZONE: "Asia/Seoul"
      }
    );

    expect(upsertJobScheduler).toHaveBeenCalledWith(
      "daily-report-9am",
      {
        pattern: "0 15 9 * * *",
        tz: "Asia/Seoul"
      },
      {
        name: "daily-report.run",
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
  });

  it("skips scheduling when disabled", async () => {
    const upsertJobScheduler = vi.fn(async () => undefined);

    await scheduleDailyReportJob(
      {
        upsertJobScheduler
      },
      {
        ENABLE_DAILY_REPORT_SCHEDULER: "false"
      }
    );

    expect(upsertJobScheduler).not.toHaveBeenCalled();
  });
});
