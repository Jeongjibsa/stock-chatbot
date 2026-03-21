import type {
  MarketIndicatorResolution,
  PortfolioTickerResolution
} from "@stock-chatbot/application";

type UserRecord = {
  displayName: string;
  id: string;
  preferredDeliveryChatId?: string | null;
  preferredDeliveryChatType?: string | null;
  telegramUserId: string;
};

type UserRepositoryPort = {
  getByTelegramUserId(telegramUserId: string): Promise<UserRecord | null>;
  upsert(input: {
    displayName: string;
    locale?: string;
    preferredDeliveryChatId?: string;
    preferredDeliveryChatType?: string;
    telegramUserId: string;
    timezone?: string;
  }): Promise<UserRecord>;
};

type PortfolioHoldingRepositoryPort = {
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
      user,
      deliveryMode:
        input.chatType === "private" ? "private_ready" : "registration_only"
    };
  }

  async addPortfolioHolding(
    telegramUserId: string,
    holding: PortfolioTickerResolution & {
      avgPrice?: string;
      note?: string;
      quantity?: string;
    }
  ): Promise<void> {
    const user = await this.requireUser(telegramUserId);
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
