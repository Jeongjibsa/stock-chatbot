import { describe, expect, it, vi } from "vitest";

import { TelegramUserPortfolioService } from "./user-portfolio-service.js";

describe("TelegramUserPortfolioService", () => {
  it("stores private chat as preferred delivery target on register", async () => {
    const userRepository = {
      getByTelegramUserId: vi.fn(),
      upsert: vi.fn(async (input) => ({
        id: "user-1",
        telegramUserId: input.telegramUserId,
        displayName: input.displayName,
        preferredDeliveryChatId: input.preferredDeliveryChatId ?? null,
        preferredDeliveryChatType: input.preferredDeliveryChatType ?? null
      }))
    };
    const service = new TelegramUserPortfolioService({
      userRepository,
      portfolioHoldingRepository: {
        listByUserId: vi.fn(),
        remove: vi.fn(),
        upsert: vi.fn()
      },
      userMarketWatchRepository: {
        addCustomItem: vi.fn(),
        listEffectiveByUserId: vi.fn(),
        showDefaultItem: vi.fn()
      }
    });

    const result = await service.registerTelegramUser({
      telegramUserId: "1001",
      displayName: "Jisung",
      languageCode: "ko",
      chatId: "2001",
      chatType: "private"
    });

    expect(result.deliveryMode).toBe("private_ready");
    expect(userRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        telegramUserId: "1001",
        preferredDeliveryChatId: "2001",
        preferredDeliveryChatType: "private",
        locale: "ko-KR"
      })
    );
  });

  it("registers group users without setting personal delivery chat", async () => {
    const userRepository = {
      getByTelegramUserId: vi.fn(),
      upsert: vi.fn(async (input) => ({
        id: "user-1",
        telegramUserId: input.telegramUserId,
        displayName: input.displayName,
        preferredDeliveryChatId: null,
        preferredDeliveryChatType: null
      }))
    };
    const service = new TelegramUserPortfolioService({
      userRepository,
      portfolioHoldingRepository: {
        listByUserId: vi.fn(),
        remove: vi.fn(),
        upsert: vi.fn()
      },
      userMarketWatchRepository: {
        addCustomItem: vi.fn(),
        listEffectiveByUserId: vi.fn(),
        showDefaultItem: vi.fn()
      }
    });

    const result = await service.registerTelegramUser({
      telegramUserId: "1001",
      displayName: "Jisung",
      chatId: "-100999",
      chatType: "supergroup"
    });

    expect(result.deliveryMode).toBe("registration_only");
    expect(userRepository.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({
        preferredDeliveryChatId: "-100999"
      })
    );
  });

  it("persists holdings for a registered user", async () => {
    const portfolioHoldingRepository = {
      listByUserId: vi.fn(),
      remove: vi.fn(),
      upsert: vi.fn(async () => undefined)
    };
    const service = new TelegramUserPortfolioService({
      userRepository: {
        getByTelegramUserId: vi.fn(async () => ({
          id: "user-1",
          telegramUserId: "1001",
          displayName: "Jisung"
        })),
        upsert: vi.fn()
      },
      portfolioHoldingRepository,
      userMarketWatchRepository: {
        addCustomItem: vi.fn(),
        listEffectiveByUserId: vi.fn(),
        showDefaultItem: vi.fn()
      }
    });

    await service.addPortfolioHolding("1001", {
      companyName: "Samsung Electronics",
      exchange: "KR",
      symbol: "005930",
      confidence: "high",
      matchedBy: "symbol",
      avgPrice: "188129",
      quantity: "27"
    });

    expect(portfolioHoldingRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        symbol: "005930",
        quantity: "27"
      })
    );
  });

  it("throws if a user is not registered", async () => {
    const service = new TelegramUserPortfolioService({
      userRepository: {
        getByTelegramUserId: vi.fn(async () => null),
        upsert: vi.fn()
      },
      portfolioHoldingRepository: {
        listByUserId: vi.fn(),
        remove: vi.fn(),
        upsert: vi.fn()
      },
      userMarketWatchRepository: {
        addCustomItem: vi.fn(),
        listEffectiveByUserId: vi.fn(),
        showDefaultItem: vi.fn()
      }
    });

    await expect(service.listPortfolioHoldings("1001")).rejects.toThrow(
      "USER_NOT_REGISTERED"
    );
  });
});
