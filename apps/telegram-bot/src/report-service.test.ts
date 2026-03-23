import { describe, expect, it, vi } from "vitest";

import {
  getRunDateForTimezone,
  isTelegramReportEnrichmentEnabled,
  resolveTelegramReportRunDate,
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
      scheduleType: "manual-pre-market"
    });
  });

  it("passes optional rebalancing payload through to the orchestrator", async () => {
    const orchestrator = {
      runForUser: vi.fn().mockResolvedValue({
        status: "completed",
        reportRun: {
          id: "run-2",
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

    await service.runForTelegramUser({
      telegramUserId: "telegram-1",
      runDate: "2026-03-21",
      portfolioRebalancing: {
        selectedProfile: "balanced",
        rebalancingSummary: {
          increaseCandidates: ["삼성전자"]
        }
      }
    });

    expect(orchestrator.runForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioRebalancing: expect.objectContaining({
          selectedProfile: "balanced"
        })
      })
    );
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

describe("resolveTelegramReportRunDate", () => {
  it("uses the timezone-aware current date even when REPORT_RUN_DATE is set", () => {
    expect(
      resolveTelegramReportRunDate(
        {
          REPORT_RUN_DATE: "2026-03-20"
        },
        {
          now: new Date("2026-03-21T16:00:00.000Z"),
          timeZone: "Asia/Seoul"
        }
      )
    ).toBe("2026-03-22");
  });

  it("falls back to timezone-aware current date when override is missing", () => {
    expect(
      resolveTelegramReportRunDate(
        {},
        {
          now: new Date("2026-03-20T16:00:00.000Z"),
          timeZone: "Asia/Seoul"
        }
      )
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

  it("returns a retry message when the previous run failed without text", () => {
    expect(
      resolveTelegramReportFollowUpMessage({
        status: "skipped_duplicate",
        reportRun: {
          id: "run-1",
          status: "failed"
        },
        reportText: "",
        marketResults: [],
        portfolioNewsBriefs: []
      })
    ).toBe("이전 브리핑 생성이 실패했습니다. 다시 /report 를 실행해 새로 생성해 주세요.");
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
