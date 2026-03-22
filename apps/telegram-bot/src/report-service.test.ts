import { describe, expect, it, vi } from "vitest";

import {
  getRunDateForTimezone,
  isTelegramReportEnrichmentEnabled,
  resolveTelegramReportFollowUpMessage,
  TelegramReportService
} from "./report-service.js";

describe("TelegramReportService", () => {
  it("runs a report for a registered telegram user", async () => {
    const orchestrator = {
      runForUser: vi.fn().mockResolvedValue({
        status: "completed",
        reportRun: {
          id: "run-1",
          status: "completed"
        },
        reportText: "report",
        marketResults: [],
        portfolioNewsBriefs: []
      })
    };
    const service = new TelegramReportService({
      orchestrator,
      userRepository: {
        async getByTelegramUserId() {
          return {
            id: "user-1",
            displayName: "Sara Kim"
          };
        }
      }
    });

    const result = await service.runForTelegramUser({
      telegramUserId: "telegram-1",
      runDate: "2026-03-21"
    });

    expect(result.status).toBe("completed");
    expect(orchestrator.runForUser).toHaveBeenCalledWith({
      user: {
        id: "user-1",
        displayName: "Sara Kim"
      },
      runDate: "2026-03-21",
      scheduleType: "telegram-report"
    });
  });

  it("throws when the telegram user is not registered", async () => {
    const service = new TelegramReportService({
      orchestrator: {
        runForUser: vi.fn()
      },
      userRepository: {
        async getByTelegramUserId() {
          return null;
        }
      }
    });

    await expect(
      service.runForTelegramUser({
        telegramUserId: "telegram-1",
        runDate: "2026-03-21"
      })
    ).rejects.toThrow("USER_NOT_REGISTERED");
  });
});

describe("getRunDateForTimezone", () => {
  it("formats run date using the provided timezone", () => {
    expect(
      getRunDateForTimezone("Asia/Seoul", new Date("2026-03-20T16:00:00.000Z"))
    ).toBe("2026-03-21");
  });
});

describe("isTelegramReportEnrichmentEnabled", () => {
  it("defaults to disabled for fast on-demand reports", () => {
    expect(isTelegramReportEnrichmentEnabled({})).toBe(false);
  });

  it("enables enrichment when the explicit flag is true", () => {
    expect(
      isTelegramReportEnrichmentEnabled({
        TELEGRAM_REPORT_ENABLE_ENRICHMENT: "true"
      })
    ).toBe(true);
  });
});

describe("resolveTelegramReportFollowUpMessage", () => {
  it("returns an in-progress message when a duplicate report has no text yet", () => {
    expect(
      resolveTelegramReportFollowUpMessage({
        status: "skipped_duplicate",
        reportRun: {
          id: "run-1",
          status: "running"
        },
        reportText: "",
        marketResults: [],
        portfolioNewsBriefs: []
      })
    ).toBe("이미 브리핑을 생성하고 있습니다. 잠시 후 다시 /report 를 실행해 주세요.");
  });

  it("returns null when a completed report contains text", () => {
    expect(
      resolveTelegramReportFollowUpMessage({
        status: "completed",
        reportRun: {
          id: "run-1",
          status: "completed"
        },
        reportText: "hello",
        marketResults: [],
        portfolioNewsBriefs: []
      })
    ).toBeNull();
  });
});
