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
        repairRetainedPublicCoverageImpl: vi.fn(async () => ({
          checked: true,
          missingCount: 0,
          referenceDate: "2026-03-20",
          repairedCount: 0,
          retentionStartDate: "2026-03-23"
        })),
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
        repairRetainedPublicCoverageImpl: vi.fn(async () => ({
          checked: true,
          missingCount: 0,
          referenceDate: "2026-03-20",
          repairedCount: 0,
          retentionStartDate: "2026-03-23"
        })),
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
        repairRetainedPublicCoverageImpl: vi.fn(async () => ({
          checked: true,
          missingCount: 0,
          referenceDate: "2026-03-28",
          repairedCount: 0,
          retentionStartDate: "2026-03-23"
        })),
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

  it("repairs retained public briefings missing after March 23, 2026", async () => {
    const runPublicBriefingImpl = vi
      .fn()
      .mockResolvedValueOnce({
        briefingSession: "pre_market",
        outputPath: "artifacts/public.json",
        publicBriefingUrl: "https://example.com/reports/report-1",
        persistedReportId: "report-1",
        runDate: "2026-03-29",
        snapshotCount: 4,
        status: "completed"
      })
      .mockResolvedValueOnce({
        briefingSession: "post_market",
        outputPath: "artifacts/public-backfill.json",
        publicBriefingUrl: "https://example.com/reports/report-2",
        persistedReportId: "report-2",
        runDate: "2026-03-24",
        snapshotCount: 4,
        status: "completed"
      });

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
        repairRetainedPublicCoverageImpl: vi.fn(async (env, dependencies) => {
          await dependencies.runPublicBriefingImpl({
            ...env,
            BRIEFING_SESSION: "post_market",
            REPORT_RUN_DATE: "2026-03-24"
          });

          return {
            checked: true,
            missingCount: 1,
            referenceDate: "2026-03-29",
            repairedCount: 1,
            retentionStartDate: "2026-03-23"
          };
        }),
        runDailyReportImpl: vi.fn(async () => ({
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
        })) as never,
        runPublicBriefingImpl: runPublicBriefingImpl as never,
        sleep: vi.fn(async () => undefined)
      }
    );

    expect(result.skipped).toBe(false);
    if (result.skipped) {
      throw new Error("expected retained repair to run");
    }
    expect(runPublicBriefingImpl).toHaveBeenCalledTimes(2);
    expect(result.retentionRepair).toEqual({
      checked: true,
      missingCount: 1,
      referenceDate: "2026-03-29",
      repairedCount: 1,
      retentionStartDate: "2026-03-23"
    });
  });
});
