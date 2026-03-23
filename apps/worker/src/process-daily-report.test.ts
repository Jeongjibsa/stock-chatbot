import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DAILY_REPORT_PROMPT_VERSION,
  DEFAULT_DAILY_REPORT_SKILL_VERSION
} from "@stock-chatbot/application";
import {
  isUserDueForScheduledReport,
  processDailyReportJob,
  readDatabaseUrl,
  readFredApiKey,
  readGeminiApiKey,
  readLlmProvider,
  readOpenAiApiKey,
  readPublicBriefingBaseUrl,
  readTelegramBotToken,
  readRunDate,
  readScheduleType,
  readScheduleWindowMinutes
} from "./process-daily-report.js";

describe("processDailyReportJob", () => {
  it("aggregates per-user orchestration results", async () => {
    const orchestrator = {
      runForUser: vi
        .fn()
        .mockResolvedValueOnce({
          status: "completed",
          reportText: "report-1"
        })
        .mockResolvedValueOnce({
          status: "partial_success",
          reportText: "report-2"
        })
        .mockResolvedValueOnce({
          status: "skipped_duplicate",
          reportText: "report-3"
        })
    };

    const summary = await processDailyReportJob({
      briefingSession: "pre_market",
      deliveryAdapter: {
        deliver: vi.fn(async () => undefined)
      },
      orchestrator,
      runDate: "2026-03-20",
      scheduleType: "manual-pre-market",
      userRepository: {
        listUsers: vi.fn(async () => [
          { id: "user-1", displayName: "A", preferredDeliveryChatId: "chat-1" },
          { id: "user-2", displayName: "B", preferredDeliveryChatId: "chat-2" },
          { id: "user-3", displayName: "C", preferredDeliveryChatId: "chat-3" }
        ])
      }
    });

    expect(summary).toEqual({
      userCount: 3,
      completedCount: 1,
      deliveredCount: 2,
      deliveryFailedCount: 0,
      deliverySkippedCount: 0,
      partialSuccessCount: 1,
      failedCount: 0,
      notDueCount: 0,
      skippedDuplicateCount: 1
    });
    expect(orchestrator.runForUser).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        promptVersion: DEFAULT_DAILY_REPORT_PROMPT_VERSION,
        skillVersion: DEFAULT_DAILY_REPORT_SKILL_VERSION
      })
    );
  });

  it("skips or records failed deliveries when delivery targets are missing or provider errors", async () => {
    const orchestrator = {
      runForUser: vi
        .fn()
        .mockResolvedValueOnce({
          status: "completed",
          reportText: "report-1"
        })
        .mockResolvedValueOnce({
          status: "partial_success",
          reportText: "report-2"
        })
    };
    const deliveryAdapter = {
      deliver: vi
        .fn()
        .mockRejectedValueOnce(new Error("telegram failed"))
    };

    const summary = await processDailyReportJob({
      briefingSession: "pre_market",
      deliveryAdapter,
      orchestrator,
      runDate: "2026-03-20",
      scheduleType: "manual-pre-market",
      userRepository: {
        listUsers: vi.fn(async () => [
          { id: "user-1", displayName: "A", preferredDeliveryChatId: "chat-1" },
          { id: "user-2", displayName: "B", preferredDeliveryChatId: null }
        ])
      }
    });

    expect(summary).toEqual({
      userCount: 2,
      completedCount: 1,
      deliveredCount: 0,
      deliveryFailedCount: 1,
      deliverySkippedCount: 1,
      partialSuccessCount: 1,
      failedCount: 0,
      notDueCount: 0,
      skippedDuplicateCount: 0
    });
    expect(deliveryAdapter.deliver).toHaveBeenCalledTimes(1);
  });

  it("filters scheduled users by enabled flag and local delivery time", async () => {
    const orchestrator = {
      runForUser: vi.fn().mockResolvedValue({
        status: "completed",
        reportText: "report-1"
      })
    };

    const summary = await processDailyReportJob({
      briefingSession: "pre_market",
      deliveryAdapter: {
        deliver: vi.fn(async () => undefined)
      },
      now: new Date("2026-03-21T00:07:00.000Z"),
      orchestrator,
      runDate: "2026-03-21",
      scheduleType: "daily-pre-market",
      scheduleWindowMinutes: 15,
      userRepository: {
        listUsers: vi.fn(async () => [
          {
            id: "user-1",
            displayName: "A",
            preferredDeliveryChatId: "chat-1",
            dailyReportEnabled: true,
            dailyReportHour: 9,
            dailyReportMinute: 0,
            timezone: "Asia/Seoul"
          },
          {
            id: "user-2",
            displayName: "B",
            preferredDeliveryChatId: "chat-2",
            dailyReportEnabled: false,
            dailyReportHour: 9,
            dailyReportMinute: 0,
            timezone: "Asia/Seoul"
          },
          {
            id: "user-3",
            displayName: "C",
            preferredDeliveryChatId: "chat-3",
            dailyReportEnabled: true,
            dailyReportHour: 10,
            dailyReportMinute: 0,
            timezone: "Asia/Seoul"
          }
        ])
      }
    });

    expect(summary).toEqual({
      userCount: 3,
      completedCount: 2,
      deliveredCount: 2,
      deliveryFailedCount: 0,
      deliverySkippedCount: 0,
      failedCount: 0,
      notDueCount: 1,
      partialSuccessCount: 0,
      skippedDuplicateCount: 0
    });
    expect(orchestrator.runForUser).toHaveBeenCalledTimes(2);
  });

  it("reads runtime env defaults and required keys", () => {
    expect(readDatabaseUrl({})).toContain("postgresql://");
    expect(
      readRunDate(
        {
          REPORT_RUN_DATE: "2026-03-20",
          REPORT_TRIGGER_TYPE: "schedule",
          REPORT_TIMEZONE: "Asia/Seoul"
        },
        {
          now: new Date("2026-03-22T16:00:00.000Z")
        }
      )
    ).toBe("2026-03-23");
    expect(
      readRunDate(
        {
          REPORT_RUN_DATE: "2026-03-20",
          REPORT_TRIGGER_TYPE: "workflow_dispatch"
        },
        {
          now: new Date("2026-03-22T16:00:00.000Z")
        }
      )
    ).toBe("2026-03-20");
    expect(readRunDate({ REPORT_RUN_DATE: "" })).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(readScheduleType({}, "pre_market")).toBe("daily-pre-market");
    expect(
      readScheduleType({ REPORT_TRIGGER_TYPE: "workflow_dispatch" }, "post_market")
    ).toBe(
      "manual-post-market"
    );
    expect(() => readFredApiKey({})).toThrow("FRED_API_KEY is missing");
    expect(readFredApiKey({ FRED_API_KEY: "fred-key" })).toBe("fred-key");
    expect(readOpenAiApiKey({})).toBeUndefined();
    expect(readOpenAiApiKey({ OPENAI_API_KEY: "openai-key" })).toBe("openai-key");
    expect(readGeminiApiKey({})).toBeUndefined();
    expect(readGeminiApiKey({ GEMINI_API_KEY: "gemini-key" })).toBe("gemini-key");
    expect(readTelegramBotToken({})).toBeUndefined();
    expect(readTelegramBotToken({ TELEGRAM_BOT_TOKEN: "telegram-token" })).toBe(
      "telegram-token"
    );
    expect(readScheduleWindowMinutes({})).toBe(15);
    expect(readScheduleWindowMinutes({ DAILY_REPORT_WINDOW_MINUTES: "10" })).toBe(
      10
    );
    expect(readLlmProvider({})).toBeUndefined();
    expect(readLlmProvider({ LLM_PROVIDER: "google" })).toBe("google");
    expect(readLlmProvider({ LLM_PROVIDER: "openai" })).toBe("openai");
    expect(readPublicBriefingBaseUrl({})).toBeUndefined();
    expect(
      readPublicBriefingBaseUrl({
        PUBLIC_BRIEFING_BASE_URL: "https://jeongjibsa.github.io/stock-chatbot/"
      })
    ).toBe("https://jeongjibsa.github.io/stock-chatbot");
  });

  it("matches local scheduled time within the allowed window", () => {
    expect(
      isUserDueForScheduledReport({
        now: new Date("2026-03-21T00:07:00.000Z"),
        user: {
          id: "user-1",
          displayName: "A",
          dailyReportEnabled: true,
          dailyReportHour: 9,
          dailyReportMinute: 0,
          timezone: "Asia/Seoul"
        },
        windowMinutes: 15
      })
    ).toBe(true);

    expect(
      isUserDueForScheduledReport({
        now: new Date("2026-03-21T00:20:00.000Z"),
        user: {
          id: "user-1",
          displayName: "A",
          dailyReportEnabled: true,
          dailyReportHour: 9,
          dailyReportMinute: 0,
          timezone: "Asia/Seoul"
        },
        windowMinutes: 15
      })
    ).toBe(false);
  });
});
