import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  telegramRequestEvents,
  type TelegramRequestEventRecord
} from "./schema.js";

export type TelegramRequestEventKind =
  | "inbound"
  | "portfolio_request"
  | "report_request";

export type InsertTelegramRequestEventInput = {
  createdAt?: Date;
  eventKind: TelegramRequestEventKind;
  telegramUserId: string;
};

export class TelegramRequestEventRepository {
  constructor(private readonly db: DatabaseClient) {}

  async insert(
    input: InsertTelegramRequestEventInput
  ): Promise<TelegramRequestEventRecord> {
    const values: {
      createdAt?: Date;
      eventKind: TelegramRequestEventKind;
      telegramUserId: string;
    } = {
      telegramUserId: input.telegramUserId,
      eventKind: input.eventKind
    };

    if (input.createdAt) {
      values.createdAt = input.createdAt;
    }

    const [created] = await this.db
      .insert(telegramRequestEvents)
      .values(values)
      .returning();

    if (!created) {
      throw new Error("Failed to insert telegram request event");
    }

    return created;
  }

  async countByTelegramUserIdSince(
    telegramUserId: string,
    since: Date,
    eventKinds?: TelegramRequestEventKind[]
  ): Promise<number> {
    const conditions = [
      eq(telegramRequestEvents.telegramUserId, telegramUserId),
      gt(telegramRequestEvents.createdAt, since)
    ];

    if (eventKinds && eventKinds.length > 0) {
      conditions.push(inArray(telegramRequestEvents.eventKind, eventKinds));
    }

    const [row] = await this.db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(telegramRequestEvents)
      .where(and(...conditions));

    return row?.count ?? 0;
  }

  async listRecentByTelegramUserId(
    telegramUserId: string,
    limit = 20
  ): Promise<TelegramRequestEventRecord[]> {
    return this.db
      .select()
      .from(telegramRequestEvents)
      .where(eq(telegramRequestEvents.telegramUserId, telegramUserId))
      .orderBy(desc(telegramRequestEvents.createdAt))
      .limit(limit);
  }

  async clearByTelegramUserIdsSince(
    telegramUserIds: string[],
    since: Date
  ): Promise<number> {
    if (telegramUserIds.length === 0) {
      return 0;
    }

    const deleted = await this.db
      .delete(telegramRequestEvents)
      .where(
        and(
          inArray(telegramRequestEvents.telegramUserId, telegramUserIds),
          gt(telegramRequestEvents.createdAt, since)
        )
      )
      .returning({
        id: telegramRequestEvents.id
      });

    return deleted.length;
  }
}
