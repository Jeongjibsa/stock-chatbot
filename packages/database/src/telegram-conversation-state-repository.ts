import { eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  telegramConversationStates,
  type TelegramConversationStateRecord
} from "./schema.js";

export class TelegramConversationStateRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getByTelegramUserId(
    telegramUserId: string
  ): Promise<TelegramConversationStateRecord | null> {
    const result = await this.db
      .select()
      .from(telegramConversationStates)
      .where(eq(telegramConversationStates.telegramUserId, telegramUserId))
      .limit(1);

    return result[0] ?? null;
  }

  async clear(telegramUserId: string): Promise<void> {
    await this.db
      .delete(telegramConversationStates)
      .where(eq(telegramConversationStates.telegramUserId, telegramUserId));
  }

  async upsert(input: {
    state: Record<string, unknown>;
    telegramUserId: string;
  }): Promise<TelegramConversationStateRecord> {
    const [result] = await this.db
      .insert(telegramConversationStates)
      .values({
        telegramUserId: input.telegramUserId,
        state: input.state
      })
      .onConflictDoUpdate({
        target: telegramConversationStates.telegramUserId,
        set: {
          state: input.state,
          updatedAt: sql`now()`
        }
      })
      .returning();

    if (!result) {
      throw new Error("Failed to upsert telegram conversation state");
    }

    return result;
  }
}
