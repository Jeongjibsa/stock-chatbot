import { describe, expect, it, vi } from "vitest";

import {
  getKstDayStart,
  isAdminTelegramUserId,
  TelegramRequestGuard
} from "./request-guard.js";

describe("request-guard", () => {
  it("recognizes the configured admin user", () => {
    expect(isAdminTelegramUserId("8606362482")).toBe(true);
    expect(isAdminTelegramUserId("1001")).toBe(false);
  });

  it("computes KST day start in UTC", () => {
    expect(getKstDayStart(new Date("2026-03-24T08:10:00.000Z")).toISOString()).toBe(
      "2026-03-23T15:00:00.000Z"
    );
  });

  it("blocks when inbound flood thresholds are exceeded", async () => {
    const requestEventRepository = {
      countByTelegramUserIdSince: vi
        .fn()
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(4),
      insert: vi.fn()
    };
    const userPortfolioService = {
      findUserIdentity: vi.fn(async () => null),
      setBlockedState: vi.fn(async () => null)
    };
    const guard = new TelegramRequestGuard({
      requestEventRepository,
      userPortfolioService
    });

    await expect(
      guard.checkInboundRateLimit({
        telegramUserId: "1001",
        displayName: "User"
      })
    ).resolves.toMatchObject({
      allowed: false
    });
    expect(userPortfolioService.setBlockedState).toHaveBeenCalledWith({
      telegramUserId: "1001",
      isBlocked: true,
      blockedReason: "flood",
      displayName: "User"
    });
  });

  it("enforces the daily report request cap", async () => {
    const requestEventRepository = {
      countByTelegramUserIdSince: vi.fn(async () => 1),
      insert: vi.fn()
    };
    const userPortfolioService = {
      findUserIdentity: vi.fn(async () => null),
      setBlockedState: vi.fn(async () => null)
    };
    const guard = new TelegramRequestGuard({
      requestEventRepository,
      userPortfolioService
    });

    await expect(
      guard.consumeFeatureRequest({
        telegramUserId: "1001",
        eventKind: "report_request"
      })
    ).resolves.toMatchObject({
      allowed: false
    });
    expect(requestEventRepository.insert).not.toHaveBeenCalled();
  });

  it("enforces the daily portfolio request cap", async () => {
    const requestEventRepository = {
      countByTelegramUserIdSince: vi.fn(async () => 3),
      insert: vi.fn()
    };
    const userPortfolioService = {
      findUserIdentity: vi.fn(async () => null),
      setBlockedState: vi.fn(async () => null)
    };
    const guard = new TelegramRequestGuard({
      requestEventRepository,
      userPortfolioService
    });

    await expect(
      guard.consumeFeatureRequest({
        telegramUserId: "1001",
        eventKind: "portfolio_request"
      })
    ).resolves.toMatchObject({
      allowed: false
    });
    expect(requestEventRepository.insert).not.toHaveBeenCalled();
  });

  it("bypasses limits for the admin user", async () => {
    const requestEventRepository = {
      countByTelegramUserIdSince: vi.fn(async () => 999),
      insert: vi.fn()
    };
    const userPortfolioService = {
      findUserIdentity: vi.fn(async () => ({
        telegramUserId: "8606362482",
        displayName: "Jisung Jung",
        isBlocked: true
      })),
      setBlockedState: vi.fn(async () => null)
    };
    const guard = new TelegramRequestGuard({
      requestEventRepository,
      userPortfolioService
    });

    await expect(
      guard.checkInboundRateLimit({
        telegramUserId: "8606362482",
        displayName: "Jisung Jung"
      })
    ).resolves.toEqual({
      allowed: true
    });
    await expect(
      guard.consumeFeatureRequest({
        telegramUserId: "8606362482",
        eventKind: "report_request"
      })
    ).resolves.toEqual({
      allowed: true
    });
    expect(requestEventRepository.insert).not.toHaveBeenCalled();
  });
});
