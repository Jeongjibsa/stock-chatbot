import type { TelegramConversationStateRepository } from "@stock-chatbot/database";

import type {
  ConversationState,
  ConversationStateStore
} from "./conversation-state.js";

export class DbConversationStateStore implements ConversationStateStore {
  constructor(
    private readonly repository: Pick<
      TelegramConversationStateRepository,
      "clear" | "getByTelegramUserId" | "upsert"
    >
  ) {}

  async clear(userKey: string): Promise<void> {
    await this.repository.clear(userKey);
  }

  async get(userKey: string): Promise<ConversationState | null> {
    const stored = await this.repository.getByTelegramUserId(userKey);

    if (!stored) {
      return null;
    }

    return stored.state as ConversationState;
  }

  async set(userKey: string, state: ConversationState): Promise<void> {
    await this.repository.upsert({
      telegramUserId: userKey,
      state: state as unknown as Record<string, unknown>
    });
  }
}
