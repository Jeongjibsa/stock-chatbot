import { describe, expect, it, vi } from "vitest";

import { TelegramUserPortfolioService } from "./user-portfolio-service.js";

function createService() {
  const userRepository = {
    getByTelegramUserId: vi.fn(),
    setBlockedState: vi.fn(),
    softUnregisterByTelegramUserId: vi.fn(),
    updateReportSettings: vi.fn(),
    upsert: vi.fn()
  };
  const portfolioHoldingRepository = {
    clearByUserId: vi.fn(async () => 0),
    getByUserAndSymbol: vi.fn(),
    listByUserId: vi.fn(),
    remove: vi.fn(),
    upsert: vi.fn(async () => undefined)
  };
  const userMarketWatchRepository = {
    addCustomItem: vi.fn(),
    listEffectiveByUserId: vi.fn(),
    showDefaultItem: vi.fn()
  };

  const service = new TelegramUserPortfolioService({
    userRepository,
    portfolioHoldingRepository,
    userMarketWatchRepository
  });

  return {
    service,
    userRepository,
    portfolioHoldingRepository,
    userMarketWatchRepository
  };
}

describe("TelegramUserPortfolioService", () => {
  it("stores private chat as preferred delivery target on register", async () => {
    const { service, userRepository, portfolioHoldingRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue(null);
    userRepository.upsert.mockImplementation(async (input) => ({
      id: "user-1",
      telegramUserId: input.telegramUserId,
      displayName: input.displayName,
      isRegistered: true,
      preferredDeliveryChatId: input.preferredDeliveryChatId ?? null,
      preferredDeliveryChatType: input.preferredDeliveryChatType ?? null,
      dailyReportEnabled: true,
      dailyReportHour: 9,
      dailyReportMinute: 0
    }));

    const result = await service.registerTelegramUser({
      telegramUserId: "1001",
      displayName: "Jisung",
      languageCode: "ko",
      chatId: "2001",
      chatType: "private"
    });

    expect(result.deliveryMode).toBe("private_ready");
    expect(result.alreadyRegistered).toBe(false);
    expect(userRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        telegramUserId: "1001",
        preferredDeliveryChatId: "2001",
        preferredDeliveryChatType: "private",
        locale: "ko-KR"
      })
    );
    expect(portfolioHoldingRepository.upsert).not.toHaveBeenCalled();
  });

  it("marks an already registered private user without blocking the upsert path", async () => {
    const { service, userRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue({
      id: "user-1",
      telegramUserId: "1001",
      displayName: "Jisung",
      isRegistered: true,
      preferredDeliveryChatId: "2001",
      preferredDeliveryChatType: "private"
    });
    userRepository.upsert.mockImplementation(async (input) => ({
      id: "user-1",
      telegramUserId: input.telegramUserId,
      displayName: input.displayName,
      isRegistered: true,
      preferredDeliveryChatId: input.preferredDeliveryChatId ?? null,
      preferredDeliveryChatType: input.preferredDeliveryChatType ?? null
    }));

    const result = await service.registerTelegramUser({
      telegramUserId: "1001",
      displayName: "Jisung",
      chatId: "2001",
      chatType: "private"
    });

    expect(result.alreadyRegistered).toBe(true);
    expect(result.deliveryMode).toBe("private_ready");
  });

  it("registers group users without setting personal delivery chat", async () => {
    const { service, userRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue(null);
    userRepository.upsert.mockImplementation(async (input) => ({
      id: "user-1",
      telegramUserId: input.telegramUserId,
      displayName: input.displayName,
      isRegistered: true,
      preferredDeliveryChatId: null,
      preferredDeliveryChatType: null,
      dailyReportEnabled: true,
      dailyReportHour: 9,
      dailyReportMinute: 0
    }));

    const result = await service.registerTelegramUser({
      telegramUserId: "1001",
      displayName: "Jisung",
      chatId: "-100999",
      chatType: "supergroup"
    });

    expect(result.deliveryMode).toBe("registration_only");
    expect(result.alreadyRegistered).toBe(false);
    expect(userRepository.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({
        preferredDeliveryChatId: "-100999"
      })
    );
  });

  it("unregisters an existing user", async () => {
    const { service, userRepository, portfolioHoldingRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue({
      id: "user-1",
      telegramUserId: "1001",
      displayName: "Jisung",
      isRegistered: true
    });
    userRepository.softUnregisterByTelegramUserId.mockResolvedValue({
      id: "user-1",
      telegramUserId: "1001",
      displayName: "Jisung",
      isRegistered: false
    });

    await expect(service.unregisterTelegramUser("1001")).resolves.toBe(true);
    expect(portfolioHoldingRepository.clearByUserId).toHaveBeenCalledWith("user-1");
    expect(userRepository.softUnregisterByTelegramUserId).toHaveBeenCalledWith("1001");
  });

  it("persists holdings for a registered user", async () => {
    const { service, userRepository, portfolioHoldingRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue({
      id: "user-1",
      telegramUserId: "1001",
      displayName: "Jisung",
      isRegistered: true
    });
    portfolioHoldingRepository.getByUserAndSymbol.mockResolvedValue(null);

    await expect(
      service.addPortfolioHolding("1001", {
        companyName: "Samsung Electronics",
        exchange: "KR",
        symbol: "005930",
        confidence: "high",
        matchedBy: "symbol",
        avgPrice: "188129",
        quantity: "27"
      })
    ).resolves.toEqual({
      created: true
    });

    expect(portfolioHoldingRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        symbol: "005930",
        quantity: "27"
      })
    );
  });

  it("skips duplicate holdings for the same user and symbol", async () => {
    const { service, userRepository, portfolioHoldingRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue({
      id: "user-1",
      telegramUserId: "1001",
      displayName: "Jisung",
      isRegistered: true
    });
    portfolioHoldingRepository.getByUserAndSymbol.mockResolvedValue({
      companyName: "Samsung Electronics",
      exchange: "KR",
      symbol: "005930"
    });

    await expect(
      service.addPortfolioHolding("1001", {
        companyName: "Samsung Electronics",
        exchange: "KR",
        symbol: "005930",
        confidence: "high",
        matchedBy: "symbol"
      })
    ).resolves.toEqual({
      created: false
    });

    expect(portfolioHoldingRepository.upsert).not.toHaveBeenCalled();
  });

  it("adds multiple holdings in bulk and skips existing ones", async () => {
    const { service, userRepository, portfolioHoldingRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue({
      id: "user-1",
      telegramUserId: "1001",
      displayName: "Jisung",
      isRegistered: true
    });
    portfolioHoldingRepository.getByUserAndSymbol
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        companyName: "SK hynix",
        exchange: "KR",
        symbol: "000660"
      });

    const result = await service.addPortfolioHoldingsBulk("1001", [
      {
        companyName: "Samsung Electronics",
        exchange: "KR",
        symbol: "005930",
        confidence: "high",
        matchedBy: "alias"
      },
      {
        companyName: "SK hynix",
        exchange: "KR",
        symbol: "000660",
        confidence: "high",
        matchedBy: "alias"
      }
    ]);

    expect(result.added).toHaveLength(1);
    expect(result.skippedExisting).toHaveLength(1);
    expect(portfolioHoldingRepository.upsert).toHaveBeenCalledTimes(1);
    expect(portfolioHoldingRepository.upsert).toHaveBeenCalledWith({
      userId: "user-1",
      companyName: "Samsung Electronics",
      symbol: "005930",
      exchange: "KR"
    });
  });

  it("throws if a user is not registered", async () => {
    const { service, userRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue(null);

    await expect(service.listPortfolioHoldings("1001")).rejects.toThrow(
      "USER_NOT_REGISTERED"
    );
  });

  it("updates daily report settings for a registered user", async () => {
    const { service, userRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue({
      id: "user-1",
      telegramUserId: "1001",
      displayName: "Jisung",
      isRegistered: true
    });
    userRepository.updateReportSettings.mockImplementation(async (input) => ({
      id: "user-1",
      telegramUserId: input.telegramUserId,
      displayName: "Jisung",
      dailyReportEnabled: input.dailyReportEnabled ?? true,
      dailyReportHour: input.dailyReportHour ?? 9,
      dailyReportMinute: input.dailyReportMinute ?? 0,
      timezone: input.timezone ?? "Asia/Seoul"
    }));

    const result = await service.updateDailyReportSettings("1001", {
      dailyReportEnabled: false,
      dailyReportHour: 21,
      dailyReportMinute: 30
    });

    expect(result).toMatchObject({
      dailyReportEnabled: false,
      dailyReportHour: 21,
      dailyReportMinute: 30
    });
  });

  it("treats soft-unregistered identities as unregistered users", async () => {
    const { service, userRepository } = createService();

    userRepository.getByTelegramUserId.mockResolvedValue({
      id: "user-1",
      telegramUserId: "1001",
      displayName: "Jisung",
      isRegistered: false
    });

    await expect(service.findRegisteredUser("1001")).resolves.toBeNull();
  });
});
