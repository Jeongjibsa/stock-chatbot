import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DAILY_REPORT_PROMPT_VERSION,
  DEFAULT_DAILY_REPORT_SKILL_VERSION
} from "@stock-chatbot/application";
import {
  processDailyReportJob,
  readDatabaseUrl,
  readFredApiKey,
  readGeminiApiKey,
  readLlmProvider,
  readOpenAiApiKey,
  readRunDate,
  readScheduleType
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
      orchestrator,
      runDate: "2026-03-20",
      scheduleType: "daily-9am",
      userRepository: {
        listUsers: vi.fn(async () => [
          { id: "user-1", displayName: "A" },
          { id: "user-2", displayName: "B" },
          { id: "user-3", displayName: "C" }
        ])
      }
    });

    expect(summary).toEqual({
      userCount: 3,
      completedCount: 1,
      partialSuccessCount: 1,
      failedCount: 0,
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

  it("reads runtime env defaults and required keys", () => {
    expect(readDatabaseUrl({})).toContain("postgresql://");
    expect(readRunDate({ REPORT_RUN_DATE: "2026-03-20" })).toBe("2026-03-20");
    expect(readScheduleType({})).toBe("daily-9am");
    expect(readScheduleType({ REPORT_TRIGGER_TYPE: "workflow_dispatch" })).toBe(
      "manual-dispatch"
    );
    expect(() => readFredApiKey({})).toThrow("FRED_API_KEY is missing");
    expect(readFredApiKey({ FRED_API_KEY: "fred-key" })).toBe("fred-key");
    expect(readOpenAiApiKey({})).toBeUndefined();
    expect(readOpenAiApiKey({ OPENAI_API_KEY: "openai-key" })).toBe("openai-key");
    expect(readGeminiApiKey({})).toBeUndefined();
    expect(readGeminiApiKey({ GEMINI_API_KEY: "gemini-key" })).toBe("gemini-key");
    expect(readLlmProvider({})).toBeUndefined();
    expect(readLlmProvider({ LLM_PROVIDER: "google" })).toBe("google");
    expect(readLlmProvider({ LLM_PROVIDER: "openai" })).toBe("openai");
  });
});
