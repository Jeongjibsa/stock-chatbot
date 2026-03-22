import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  telegramOutboundMessages,
  type TelegramOutboundMessageRecord
} from "./schema.js";

export type InsertTelegramOutboundMessageInput = {
  chatId: string;
  method?: string;
  telegramMessageId?: string;
  text: string;
};

export class TelegramOutboundMessageRepository {
  constructor(private readonly db: DatabaseClient) {}

  async insert(
    input: InsertTelegramOutboundMessageInput
  ): Promise<TelegramOutboundMessageRecord> {
    const [created] = await this.db
      .insert(telegramOutboundMessages)
      .values({
        chatId: input.chatId,
        method: input.method ?? "sendMessage",
        telegramMessageId: input.telegramMessageId,
        text: input.text
      })
      .returning();

    if (!created) {
      throw new Error("Failed to insert telegram outbound message");
    }

    return created;
  }

  async listByChatId(
    chatId: string,
    options: {
      limit?: number;
      since?: Date;
    } = {}
  ): Promise<TelegramOutboundMessageRecord[]> {
    const limit = options.limit ?? 50;

    const conditions = [eq(telegramOutboundMessages.chatId, chatId)];

    if (options.since) {
      conditions.push(gt(telegramOutboundMessages.createdAt, options.since));
    }

    return this.db
      .select()
      .from(telegramOutboundMessages)
      .where(and(...conditions))
      .orderBy(asc(telegramOutboundMessages.createdAt))
      .limit(limit);
  }

  async clearByChatIdsSince(chatIds: string[], since: Date): Promise<number> {
    if (chatIds.length === 0) {
      return 0;
    }

    const deleted = await this.db
      .delete(telegramOutboundMessages)
      .where(
        and(
          inArray(telegramOutboundMessages.chatId, chatIds),
          gt(telegramOutboundMessages.createdAt, since)
        )
      )
      .returning({ id: telegramOutboundMessages.id });

    return deleted.length;
  }

  async countByChatIdSince(chatId: string, since: Date): Promise<number> {
    const [row] = await this.db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(telegramOutboundMessages)
      .where(
        and(
          eq(telegramOutboundMessages.chatId, chatId),
          gt(telegramOutboundMessages.createdAt, since)
        )
      );

    return row?.count ?? 0;
  }
}
