import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_POST_MARKET_REPORT_PATTERN,
  DEFAULT_PRE_MARKET_REPORT_PATTERN,
  DEFAULT_REPORT_TIMEZONE,
  POST_MARKET_DAILY_REPORT_SCHEDULER_ID,
  PRE_MARKET_DAILY_REPORT_SCHEDULER_ID,
  readDailyReportPattern,
  readReportTimezone,
  readSchedulerEnabled,
  scheduleDailyReportJob
} from "./scheduler.js";

describe("scheduler", () => {
  it("reads default schedule values", () => {
    expect(readDailyReportPattern({}, "pre_market")).toBe(
      DEFAULT_PRE_MARKET_REPORT_PATTERN
    );
    expect(readDailyReportPattern({}, "post_market")).toBe(
      DEFAULT_POST_MARKET_REPORT_PATTERN
    );
    expect(readReportTimezone({})).toBe(DEFAULT_REPORT_TIMEZONE);
    expect(readSchedulerEnabled({})).toBe(true);
  });

  it("honors explicit scheduler overrides", () => {
    expect(
      readDailyReportPattern({ PRE_MARKET_REPORT_PATTERN: "0 30 7 * * 1-6" }, "pre_market")
    ).toBe("0 30 7 * * 1-6");
    expect(
      readDailyReportPattern({ POST_MARKET_REPORT_PATTERN: "0 30 20 * * 1-5" }, "post_market")
    ).toBe("0 30 20 * * 1-5");
    expect(readReportTimezone({ REPORT_TIMEZONE: "UTC" })).toBe("UTC");
    expect(
      readSchedulerEnabled({ ENABLE_DAILY_REPORT_SCHEDULER: "false" })
    ).toBe(false);
  });

  it("upserts both daily report schedulers with session-aware payloads", async () => {
    const upsertJobScheduler = vi.fn(async () => undefined);

    await scheduleDailyReportJob(
      {
        upsertJobScheduler
      },
      {
        POST_MARKET_REPORT_PATTERN: "0 30 20 * * 1-5",
        PRE_MARKET_REPORT_PATTERN: "0 30 7 * * 1-6",
        REPORT_TIMEZONE: "Asia/Seoul"
      }
    );

    expect(upsertJobScheduler).toHaveBeenNthCalledWith(
      1,
      PRE_MARKET_DAILY_REPORT_SCHEDULER_ID,
      {
        pattern: "0 30 7 * * 1-6",
        tz: "Asia/Seoul"
      },
      {
        name: "daily-report.run",
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

    expect(upsertJobScheduler).toHaveBeenNthCalledWith(
      2,
      POST_MARKET_DAILY_REPORT_SCHEDULER_ID,
      {
        pattern: "0 30 20 * * 1-5",
        tz: "Asia/Seoul"
      },
      {
        name: "daily-report.run",
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
