import { describe, expect, it, vi } from "vitest";

import { runBriefingSession } from "./briefing-cron";

describe("runBriefingSession", () => {
  it("runs public briefing before daily report and passes the explicit url through", async () => {
    const order: string[] = [];
    const result = await runBriefingSession(
      {
        briefingSession: "pre_market",
        runtimeEnv: {
          CRON_SECRET: "secret",
          DAILY_REPORT_WINDOW_MINUTES: "15",
          DATABASE_URL: "postgres://example",
          FRED_API_KEY: "fred-key",
          GEMINI_API_KEY: undefined,
          LLM_PROVIDER: undefined,
          OPENAI_API_KEY: undefined,
          PUBLIC_BRIEFING_BASE_URL: "https://example.com",
          REDIS_URL: undefined,
          REPORT_TIMEZONE: "Asia/Seoul",
          TELEGRAM_BOT_TOKEN: "token",
          UPSTASH_REDIS_REST_TOKEN: undefined,
          UPSTASH_REDIS_REST_URL: undefined
        },
        triggerType: "workflow_dispatch"
      },
      {
        runPublicBriefingImpl: vi.fn(async () => {
          order.push("public");
          return {
            briefingSession: "pre_market",
            outputPath: "artifacts/public.json",
            publicBriefingUrl: "https://example.com/reports/report-1",
            persistedReportId: "report-1",
            runDate: "2026-03-20",
            snapshotCount: 4,
            status: "completed"
          };
        }) as never,
        runDailyReportImpl: vi.fn(async (_env, input) => {
          order.push("daily");
          expect(input?.publicBriefingUrl).toBe("https://example.com/reports/report-1");
          return {
            completedCount: 1,
            deliveredCount: 1,
            deliveryFailedCount: 0,
            deliverySkippedCount: 0,
            failedCount: 0,
            linkAttachedCount: 1,
            notDueCount: 0,
            partialSuccessCount: 0,
            skippedDuplicateCount: 0,
            userCount: 1
          };
        }) as never,
        sleep: vi.fn(async () => undefined)
      }
    );

    expect(result.skipped).toBe(false);
    if (result.skipped) {
      throw new Error("expected briefing session to run");
    }
    const publicBriefing = result.publicBriefing!;

    expect(order).toEqual(["public", "daily"]);
    expect(result.linkAttachedToDaily).toBe(true);
    expect(publicBriefing.status).toBe("completed");
    expect(publicBriefing.persistedReportId).toBe("report-1");
    expect(publicBriefing.retryCount).toBe(0);
  });

  it("retries missing public links before falling back to daily without a link", async () => {
    const sleep = vi.fn(async () => undefined);
    const runPublicBriefingImpl = vi
      .fn()
      .mockResolvedValueOnce({
        briefingSession: "pre_market",
        outputPath: "artifacts/public.json",
        runDate: "2026-03-20",
        snapshotCount: 4,
        status: "missing_link"
      })
      .mockResolvedValueOnce({
        briefingSession: "pre_market",
        outputPath: "artifacts/public.json",
        runDate: "2026-03-20",
        snapshotCount: 4,
        status: "missing_link"
      })
      .mockResolvedValueOnce({
        briefingSession: "pre_market",
        outputPath: "artifacts/public.json",
        runDate: "2026-03-20",
        snapshotCount: 4,
        status: "missing_link"
      });
    const runDailyReportImpl = vi.fn(async () => ({
      completedCount: 1,
      deliveredCount: 1,
      deliveryFailedCount: 0,
      deliverySkippedCount: 0,
      failedCount: 0,
      linkAttachedCount: 0,
      notDueCount: 0,
      partialSuccessCount: 0,
      skippedDuplicateCount: 0,
      userCount: 1
    }));

    const result = await runBriefingSession(
      {
        briefingSession: "pre_market",
        runtimeEnv: {
          CRON_SECRET: "secret",
          DAILY_REPORT_WINDOW_MINUTES: "15",
          DATABASE_URL: "postgres://example",
          FRED_API_KEY: "fred-key",
          GEMINI_API_KEY: undefined,
          LLM_PROVIDER: undefined,
          OPENAI_API_KEY: undefined,
          PUBLIC_BRIEFING_BASE_URL: "https://example.com",
          REDIS_URL: undefined,
          REPORT_TIMEZONE: "Asia/Seoul",
          TELEGRAM_BOT_TOKEN: "token",
          UPSTASH_REDIS_REST_TOKEN: undefined,
          UPSTASH_REDIS_REST_URL: undefined
        },
        triggerType: "workflow_dispatch"
      },
      {
        runPublicBriefingImpl: runPublicBriefingImpl as never,
        runDailyReportImpl: runDailyReportImpl as never,
        sleep
      }
    );

    expect(result.skipped).toBe(false);
    if (result.skipped) {
      throw new Error("expected briefing session to run");
    }
    const publicBriefing = result.publicBriefing!;

    expect(runPublicBriefingImpl).toHaveBeenCalledTimes(3);
    expect(runDailyReportImpl).toHaveBeenCalledWith(expect.any(Object), {
      briefingSession: "pre_market"
    });
    expect(sleep).toHaveBeenNthCalledWith(1, 10000);
    expect(sleep).toHaveBeenNthCalledWith(2, 20000);
    expect(publicBriefing.retryCount).toBe(2);
    expect(result.linkAttachedToDaily).toBe(false);
  });

  it("runs only the public briefing for weekend sessions", async () => {
    const runDailyReportImpl = vi.fn();
    const result = await runBriefingSession(
      {
        briefingSession: "weekend_briefing",
        runtimeEnv: {
          CRON_SECRET: "secret",
          DAILY_REPORT_WINDOW_MINUTES: "15",
          DATABASE_URL: "postgres://example",
          FRED_API_KEY: "fred-key",
          GEMINI_API_KEY: undefined,
          LLM_PROVIDER: undefined,
          OPENAI_API_KEY: undefined,
          PUBLIC_BRIEFING_BASE_URL: "https://example.com",
          REDIS_URL: undefined,
          REPORT_TIMEZONE: "Asia/Seoul",
          TELEGRAM_BOT_TOKEN: "token",
          UPSTASH_REDIS_REST_TOKEN: undefined,
          UPSTASH_REDIS_REST_URL: undefined
        },
        triggerType: "workflow_dispatch"
      },
      {
        runPublicBriefingImpl: vi.fn(async () => ({
          briefingSession: "weekend_briefing",
          outputPath: "artifacts/weekend.json",
          publicBriefingUrl: "https://example.com/reports/weekend",
          persistedReportId: "report-weekend",
          runDate: "2026-03-28",
          snapshotCount: 3,
          status: "completed"
        })) as never,
        runDailyReportImpl: runDailyReportImpl as never,
        sleep: vi.fn(async () => undefined)
      }
    );

    expect(result.skipped).toBe(false);
    if (result.skipped) {
      throw new Error("expected weekend briefing session to run");
    }
    expect(result.linkAttachedToDaily).toBe(false);
    expect(result.publicBriefing?.briefingSession).toBe("weekend_briefing");
    expect(runDailyReportImpl).not.toHaveBeenCalled();
  });
});
