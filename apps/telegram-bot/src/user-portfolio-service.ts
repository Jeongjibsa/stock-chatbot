import type {
  MarketIndicatorResolution,
  PortfolioTickerResolution
} from "@stock-chatbot/application";

type UserRecord = {
  dailyReportEnabled?: boolean;
  dailyReportHour?: number;
  dailyReportMinute?: number;
  displayName: string;
  id: string;
  includePublicBriefingLink?: boolean;
  preferredDeliveryChatId?: string | null;
  preferredDeliveryChatType?: string | null;
  reportDetailLevel?: string | null;
  telegramUserId: string;
  timezone?: string;
};

type UserRepositoryPort = {
  deleteByTelegramUserId(telegramUserId: string): Promise<boolean>;
  getByTelegramUserId(telegramUserId: string): Promise<UserRecord | null>;
  updateReportSettings(input: {
    dailyReportEnabled?: boolean;
    dailyReportHour?: number;
    dailyReportMinute?: number;
    includePublicBriefingLink?: boolean;
    reportDetailLevel?: "compact" | "standard";
    telegramUserId: string;
    timezone?: string;
  }): Promise<UserRecord>;
  upsert(input: {
    dailyReportEnabled?: boolean;
    dailyReportHour?: number;
    dailyReportMinute?: number;
    displayName: string;
    includePublicBriefingLink?: boolean;
    locale?: string;
    preferredDeliveryChatId?: string;
    preferredDeliveryChatType?: string;
    reportDetailLevel?: "compact" | "standard";
    telegramUserId: string;
    timezone?: string;
  }): Promise<UserRecord>;
};

type PortfolioHoldingRepositoryPort = {
  getByUserAndSymbol(
    userId: string,
    symbol: string,
    exchange: string
  ): Promise<
    | {
        companyName: string;
        exchange: string;
        symbol: string;
      }
    | null
  >;
  listByUserId(userId: string): Promise<
    Array<{
      avgPrice?: string | null;
      companyName: string;
      exchange: string;
      note?: string | null;
      quantity?: string | null;
      symbol: string;
    }>
  >;
  remove(userId: string, symbol: string, exchange: string): Promise<boolean>;
  upsert(input: {
    avgPrice?: string;
    companyName: string;
    exchange: string;
    note?: string;
    quantity?: string;
    symbol: string;
    userId: string;
  }): Promise<unknown>;
};

type UserMarketWatchRepositoryPort = {
  addCustomItem(input: {
    assetType: string;
    itemCode: string;
    itemName: string;
    sourceKey: string;
    userId: string;
  }): Promise<unknown>;
  listEffectiveByUserId(userId: string): Promise<
    Array<{
      isDefault: boolean;
      itemCode: string;
      itemName: string;
    }>
  >;
  showDefaultItem(userId: string, itemCode: string): Promise<unknown>;
};

export type RegisterTelegramUserResult = {
  alreadyRegistered: boolean;
  deliveryMode: "private_ready" | "registration_only";
  user: UserRecord;
};

export class TelegramUserPortfolioService {
  constructor(
    private readonly dependencies: {
      portfolioHoldingRepository: PortfolioHoldingRepositoryPort;
      userMarketWatchRepository: UserMarketWatchRepositoryPort;
      userRepository: UserRepositoryPort;
    }
  ) {}

  async findRegisteredUser(telegramUserId: string): Promise<UserRecord | null> {
    return this.dependencies.userRepository.getByTelegramUserId(telegramUserId);
  }

  async registerTelegramUser(input: {
    chatId: string;
    chatType: string;
    displayName: string;
    languageCode?: string;
    telegramUserId: string;
  }): Promise<RegisterTelegramUserResult> {
    const existingUser = await this.dependencies.userRepository.getByTelegramUserId(
      input.telegramUserId
    );
    const locale = toLocale(input.languageCode);
    const upsertInput: {
      displayName: string;
      locale?: string;
      preferredDeliveryChatId?: string;
      preferredDeliveryChatType?: string;
      telegramUserId: string;
      timezone?: string;
    } = {
      telegramUserId: input.telegramUserId,
      displayName: input.displayName,
      locale
    };

    if (input.chatType === "private") {
      upsertInput.preferredDeliveryChatId = input.chatId;
      upsertInput.preferredDeliveryChatType = input.chatType;
    }

    const user = await this.dependencies.userRepository.upsert(upsertInput);

    return {
      alreadyRegistered:
        existingUser !== null &&
        input.chatType === "private" &&
        existingUser.preferredDeliveryChatId === input.chatId &&
        existingUser.preferredDeliveryChatType === input.chatType,
      user,
      deliveryMode:
        input.chatType === "private" ? "private_ready" : "registration_only"
    };
  }

  async unregisterTelegramUser(telegramUserId: string): Promise<boolean> {
    return this.dependencies.userRepository.deleteByTelegramUserId(telegramUserId);
  }

  async addPortfolioHolding(
    telegramUserId: string,
    holding: PortfolioTickerResolution & {
      avgPrice?: string;
      note?: string;
      quantity?: string;
    }
  ): Promise<{ created: boolean }> {
    const user = await this.requireUser(telegramUserId);
    const existing =
      await this.dependencies.portfolioHoldingRepository.getByUserAndSymbol(
        user.id,
        holding.symbol,
        holding.exchange
      );

    if (existing) {
      return {
        created: false
      };
    }

    const upsertInput: {
      avgPrice?: string;
      companyName: string;
      exchange: string;
      note?: string;
      quantity?: string;
      symbol: string;
      userId: string;
    } = {
      userId: user.id,
      companyName: holding.companyName,
      symbol: holding.symbol,
      exchange: holding.exchange
    };

    if (holding.avgPrice !== undefined) {
      upsertInput.avgPrice = holding.avgPrice;
    }

    if (holding.quantity !== undefined) {
      upsertInput.quantity = holding.quantity;
    }

    if (holding.note !== undefined) {
      upsertInput.note = holding.note;
    }

    await this.dependencies.portfolioHoldingRepository.upsert(upsertInput);

    return {
      created: true
    };
  }

  async addPortfolioHoldingsBulk(
    telegramUserId: string,
    holdings: PortfolioTickerResolution[]
  ): Promise<{
    added: PortfolioTickerResolution[];
    skippedExisting: PortfolioTickerResolution[];
  }> {
    const user = await this.requireUser(telegramUserId);
    const added: PortfolioTickerResolution[] = [];
    const skippedExisting: PortfolioTickerResolution[] = [];

    for (const holding of holdings) {
      const existing =
        await this.dependencies.portfolioHoldingRepository.getByUserAndSymbol(
          user.id,
          holding.symbol,
          holding.exchange
        );

      if (existing) {
        skippedExisting.push(holding);
        continue;
      }

      await this.dependencies.portfolioHoldingRepository.upsert({
        userId: user.id,
        companyName: holding.companyName,
        symbol: holding.symbol,
        exchange: holding.exchange
      });
      added.push(holding);
    }

    return {
      added,
      skippedExisting
    };
  }

  async removePortfolioHolding(
    telegramUserId: string,
    resolution: PortfolioTickerResolution
  ): Promise<boolean> {
    const user = await this.requireUser(telegramUserId);

    return this.dependencies.portfolioHoldingRepository.remove(
      user.id,
      resolution.symbol,
      resolution.exchange
    );
  }

  async listPortfolioHoldings(telegramUserId: string) {
    const user = await this.requireUser(telegramUserId);

    return this.dependencies.portfolioHoldingRepository.listByUserId(user.id);
  }

  async addMarketIndicator(
    telegramUserId: string,
    resolution: MarketIndicatorResolution
  ): Promise<void> {
    const user = await this.requireUser(telegramUserId);

    await this.dependencies.userMarketWatchRepository.showDefaultItem(
      user.id,
      resolution.itemCode
    );
  }

  async listMarketIndicators(telegramUserId: string) {
    const user = await this.requireUser(telegramUserId);

    return this.dependencies.userMarketWatchRepository.listEffectiveByUserId(user.id);
  }

  async updateDailyReportSettings(
    telegramUserId: string,
    input: {
      dailyReportEnabled?: boolean;
      dailyReportHour?: number;
      dailyReportMinute?: number;
      includePublicBriefingLink?: boolean;
      reportDetailLevel?: "compact" | "standard";
      timezone?: string;
    }
  ): Promise<UserRecord> {
    await this.requireUser(telegramUserId);

    return this.dependencies.userRepository.updateReportSettings({
      telegramUserId,
      ...input
    });
  }

  private async requireUser(telegramUserId: string): Promise<UserRecord> {
    const user = await this.dependencies.userRepository.getByTelegramUserId(telegramUserId);

    if (!user) {
      throw new Error("USER_NOT_REGISTERED");
    }

    return user;
  }
}

function toLocale(languageCode?: string): string {
  if (!languageCode) {
    return "ko-KR";
  }

  if (languageCode === "ko") {
    return "ko-KR";
  }

  if (languageCode === "en") {
    return "en-US";
  }

  return languageCode;
}
