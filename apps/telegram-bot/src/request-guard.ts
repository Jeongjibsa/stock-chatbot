import type { TelegramRequestEventKind } from "@stock-chatbot/database";

const ADMIN_TELEGRAM_USER_ID = "8606362482";
const FLOOD_LIMIT_PER_SECOND = 3;
const FLOOD_LIMIT_PER_TEN_SECONDS = 10;

type RequestEventRepositoryPort = {
  countByTelegramUserIdSince(
    telegramUserId: string,
    since: Date,
    eventKinds?: TelegramRequestEventKind[]
  ): Promise<number>;
  insert(input: {
    createdAt?: Date;
    eventKind: TelegramRequestEventKind;
    telegramUserId: string;
  }): Promise<unknown>;
};

type UserIdentityPort = {
  blockedReason?: string | null;
  displayName: string;
  isBlocked?: boolean;
  telegramUserId: string;
};

type UserPortfolioServicePort = {
  findUserIdentity(telegramUserId: string): Promise<UserIdentityPort | null>;
  setBlockedState(input: {
    blockedReason?: "flood" | "manual" | null;
    displayName?: string;
    isBlocked: boolean;
    telegramUserId: string;
  }): Promise<UserIdentityPort | null>;
};

type LimitDecision = {
  allowed: boolean;
  message?: string;
};

export function isAdminTelegramUserId(telegramUserId: string | undefined): boolean {
  return telegramUserId === ADMIN_TELEGRAM_USER_ID;
}

export function getKstDayStart(now: Date = new Date()): Date {
  const kstFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = kstFormatter.formatToParts(now);
  const year = Number.parseInt(
    parts.find((part) => part.type === "year")?.value ?? "0",
    10
  );
  const month = Number.parseInt(
    parts.find((part) => part.type === "month")?.value ?? "1",
    10
  );
  const day = Number.parseInt(
    parts.find((part) => part.type === "day")?.value ?? "1",
    10
  );

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 9 * 60 * 60 * 1_000);
}

export class TelegramRequestGuard {
  constructor(
    private readonly dependencies: {
      requestEventRepository: RequestEventRepositoryPort;
      userPortfolioService: UserPortfolioServicePort;
    }
  ) {}

  async checkInboundRateLimit(input: {
    displayName?: string;
    now?: Date;
    telegramUserId: string;
  }): Promise<LimitDecision> {
    if (isAdminTelegramUserId(input.telegramUserId)) {
      return {
        allowed: true
      };
    }

    const identity = await this.dependencies.userPortfolioService.findUserIdentity(
      input.telegramUserId
    );

    if (identity?.isBlocked) {
      return {
        allowed: false,
        message: buildBlockedMessage(normalizeBlockedReason(identity.blockedReason))
      };
    }

    const now = input.now ?? new Date();
    await this.dependencies.requestEventRepository.insert({
      telegramUserId: input.telegramUserId,
      eventKind: "inbound",
      createdAt: now
    });

    const [countPerSecond, countPerTenSeconds] = await Promise.all([
      this.dependencies.requestEventRepository.countByTelegramUserIdSince(
        input.telegramUserId,
        new Date(now.valueOf() - 1_000),
        ["inbound"]
      ),
      this.dependencies.requestEventRepository.countByTelegramUserIdSince(
        input.telegramUserId,
        new Date(now.valueOf() - 10_000),
        ["inbound"]
      )
    ]);

    if (
      countPerSecond > FLOOD_LIMIT_PER_SECOND ||
      countPerTenSeconds > FLOOD_LIMIT_PER_TEN_SECONDS
    ) {
      const blockInput: {
        blockedReason: "flood";
        displayName?: string;
        isBlocked: true;
        telegramUserId: string;
      } = {
        telegramUserId: input.telegramUserId,
        isBlocked: true,
        blockedReason: "flood"
      };

      if (input.displayName) {
        blockInput.displayName = input.displayName;
      }

      await this.dependencies.userPortfolioService.setBlockedState(blockInput);

      return {
        allowed: false,
        message: buildBlockedMessage("flood")
      };
    }

    return {
      allowed: true
    };
  }

  async consumeFeatureRequest(input: {
    eventKind: Extract<TelegramRequestEventKind, "portfolio_request" | "report_request">;
    now?: Date;
    telegramUserId: string;
  }): Promise<LimitDecision> {
    if (isAdminTelegramUserId(input.telegramUserId)) {
      return {
        allowed: true
      };
    }

    const identity = await this.dependencies.userPortfolioService.findUserIdentity(
      input.telegramUserId
    );

    if (identity?.isBlocked) {
      return {
        allowed: false,
        message: buildBlockedMessage(normalizeBlockedReason(identity.blockedReason))
      };
    }

    const now = input.now ?? new Date();
    const limit = input.eventKind === "report_request" ? 1 : 3;
    const used = await this.dependencies.requestEventRepository.countByTelegramUserIdSince(
      input.telegramUserId,
      getKstDayStart(now),
      [input.eventKind]
    );

    if (used >= limit) {
      return {
        allowed: false,
        message:
          input.eventKind === "report_request"
            ? buildReportRequestLimitMessage()
            : buildPortfolioEntryLimitMessage()
      };
    }

    await this.dependencies.requestEventRepository.insert({
      telegramUserId: input.telegramUserId,
      eventKind: input.eventKind,
      createdAt: now
    });

    return {
      allowed: true
    };
  }
}

export function buildReportRequestLimitMessage(): string {
  return "온디맨드 /report 는 하루에 1회까지만 요청할 수 있습니다. 정기 브리핑을 확인해 주세요.";
}

export function buildPortfolioEntryLimitMessage(): string {
  return "종목 추가 요청은 하루에 3회까지만 가능합니다.";
}

function buildBlockedMessage(reason: "flood" | "manual"): string {
  if (reason === "flood") {
    return "과도한 요청으로 계정이 차단되었습니다. 운영자가 해제할 때까지 요청할 수 없습니다.";
  }

  return "현재 이 계정은 차단되어 있습니다. 운영자에게 문의해 주세요.";
}

function normalizeBlockedReason(value: string | null | undefined): "flood" | "manual" {
  return value === "flood" ? "flood" : "manual";
}
