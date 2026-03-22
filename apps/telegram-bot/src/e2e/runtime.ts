import {
  TelegramBotApiClient
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  PortfolioHoldingRepository,
  ReportRunRepository,
  TelegramConversationStateRepository,
  TelegramOutboundMessageRepository,
  TelegramProcessedUpdateRepository,
  UserMarketWatchItemRepository,
  UserRepository
} from "@stock-chatbot/database";

import type { TelegramE2EConfig } from "./env.js";
import {
  buildGroupNewMemberUpdate,
  buildGroupTextMessageUpdate,
  buildPrivateTextMessageUpdate,
  postSyntheticTelegramUpdate
} from "./webhook-driver.js";

const DEFAULT_MATCH_TIMEOUT_MS = 20_000;

export class TelegramE2ERuntime {
  private readonly pool;
  private readonly db;

  readonly botApiClient: TelegramBotApiClient;
  readonly userRepository: UserRepository;
  readonly portfolioHoldingRepository: PortfolioHoldingRepository;
  readonly marketWatchRepository: UserMarketWatchItemRepository;
  readonly reportRunRepository: ReportRunRepository;
  readonly conversationStateRepository: TelegramConversationStateRepository;
  readonly processedUpdateRepository: TelegramProcessedUpdateRepository;
  readonly outboundMessageRepository: TelegramOutboundMessageRepository;

  private readonly updateBase = Number(`${Date.now()}`.slice(-11)) * 100;
  private nextUpdateOffset = 1;
  private readonly usedUpdateIds: string[] = [];

  constructor(readonly config: TelegramE2EConfig) {
    this.pool = createPool(config.databaseUrl);
    this.db = createDatabase(this.pool);
    this.botApiClient = new TelegramBotApiClient({
      token: config.token
    });
    this.userRepository = new UserRepository(this.db);
    this.portfolioHoldingRepository = new PortfolioHoldingRepository(this.db);
    this.marketWatchRepository = new UserMarketWatchItemRepository(this.db);
    this.reportRunRepository = new ReportRunRepository(this.db);
    this.conversationStateRepository = new TelegramConversationStateRepository(this.db);
    this.processedUpdateRepository = new TelegramProcessedUpdateRepository(this.db);
    this.outboundMessageRepository = new TelegramOutboundMessageRepository(this.db);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  nextUpdateId(): number {
    const updateId = this.updateBase + this.nextUpdateOffset++;
    this.usedUpdateIds.push(String(updateId));
    return updateId;
  }

  async resetUser(telegramUserId: string): Promise<void> {
    await this.conversationStateRepository.clear(telegramUserId);
    await this.userRepository.deleteByTelegramUserId(telegramUserId);
  }

  async cleanupSuiteArtifacts(input: {
    chatIds: string[];
    since: Date;
  }): Promise<void> {
    await this.processedUpdateRepository.deleteByIds(this.usedUpdateIds);
    await this.outboundMessageRepository.clearByChatIdsSince(
      input.chatIds,
      input.since
    );
  }

  async invokePrivateText(input: {
    chatId: string;
    text: string;
    updateId: number;
    userId: string;
  }): Promise<void> {
    await postSyntheticTelegramUpdate({
      webhookUrl: this.config.webhookUrl,
      webhookSecretToken: this.config.webhookSecretToken,
      payload: buildPrivateTextMessageUpdate(input)
    });
  }

  async invokeGroupText(input: {
    chatId: string;
    text: string;
    updateId: number;
    userId: string;
  }): Promise<void> {
    await postSyntheticTelegramUpdate({
      webhookUrl: this.config.webhookUrl,
      webhookSecretToken: this.config.webhookSecretToken,
      payload: buildGroupTextMessageUpdate(input)
    });
  }

  async invokeGroupJoin(input: {
    chatId: string;
    joinedUserId: string;
    joinedUserName: string;
    updateId: number;
  }): Promise<void> {
    await postSyntheticTelegramUpdate({
      webhookUrl: this.config.webhookUrl,
      webhookSecretToken: this.config.webhookSecretToken,
      payload: buildGroupNewMemberUpdate(input)
    });
  }

  async waitForReplyContaining(input: {
    chatId: string;
    expectedPhrases: string[];
    since: Date;
    timeoutMs?: number;
  }) {
    const waitInput: {
      chatId: string;
      predicate: (
        messages: Awaited<ReturnType<TelegramOutboundMessageRepository["listByChatId"]>>
      ) => boolean;
      since: Date;
      timeoutMs?: number;
    } = {
      chatId: input.chatId,
      since: input.since,
      predicate: (messages) =>
        input.expectedPhrases.every((phrase) =>
          messages.some((message) => message.text.includes(phrase))
        )
    };

    if (input.timeoutMs !== undefined) {
      waitInput.timeoutMs = input.timeoutMs;
    }

    return this.waitForReplies(waitInput);
  }

  async waitForReplies(input: {
    chatId: string;
    predicate: (
      messages: Awaited<ReturnType<TelegramOutboundMessageRepository["listByChatId"]>>
    ) => boolean;
    since: Date;
    timeoutMs?: number;
  }) {
    const timeoutMs = input.timeoutMs ?? this.config.timeoutMs ?? DEFAULT_MATCH_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() <= deadline) {
      const messages = await this.outboundMessageRepository.listByChatId(input.chatId, {
        since: input.since,
        limit: 20
      });

      if (input.predicate(messages)) {
        return messages;
      }

      await sleep(this.config.pollIntervalMs);
    }

    const messages = await this.outboundMessageRepository.listByChatId(input.chatId, {
      since: input.since,
      limit: 20
    });

    throw new Error(
      `Timed out waiting for reply in chat ${input.chatId}. Replies seen: ${messages
        .map((message) => JSON.stringify(message.text))
        .join(", ")}`
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
