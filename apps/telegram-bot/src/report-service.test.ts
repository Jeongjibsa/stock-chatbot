import { describe, expect, it, vi } from "vitest";

import {
  getRunDateForTimezone,
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
