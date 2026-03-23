import { desc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import { users, type UserRecord } from "./schema.js";

export type UpsertUserInput = {
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
};

export type SetBlockedStateInput = {
  blockedReason?: "flood" | "manual" | null;
  displayName?: string;
  isBlocked: boolean;
  telegramUserId: string;
};

export type UpdateUserReportSettingsInput = {
  dailyReportEnabled?: boolean;
  dailyReportHour?: number;
  dailyReportMinute?: number;
  includePublicBriefingLink?: boolean;
  reportDetailLevel?: "compact" | "standard";
  telegramUserId: string;
  timezone?: string;
};

export class UserRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getByTelegramUserId(telegramUserId: string): Promise<UserRecord | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.telegramUserId, telegramUserId))
      .limit(1);

    return result[0] ?? null;
  }

  async listUsers(): Promise<UserRecord[]> {
    return this.db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteByTelegramUserId(telegramUserId: string): Promise<boolean> {
    const result = await this.db
      .delete(users)
      .where(eq(users.telegramUserId, telegramUserId))
      .returning({ id: users.id });

    return result.length > 0;
  }

  async softUnregisterByTelegramUserId(
    telegramUserId: string
  ): Promise<UserRecord | null> {
    const [updated] = await this.db
      .update(users)
      .set({
        isRegistered: false,
        preferredDeliveryChatId: null,
        preferredDeliveryChatType: null,
        dailyReportEnabled: false,
        unregisteredAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();

    return updated ?? null;
  }

  async setBlockedState(input: SetBlockedStateInput): Promise<UserRecord | null> {
    const updateSet: Record<string, unknown> = {
      isBlocked: input.isBlocked,
      blockedReason: input.isBlocked ? (input.blockedReason ?? "manual") : null,
      blockedAt: input.isBlocked ? sql`now()` : null,
      updatedAt: sql`now()`
    };

    if (input.displayName) {
      updateSet.displayName = input.displayName;
    }

    if (input.isBlocked && input.displayName) {
      const [upserted] = await this.db
        .insert(users)
        .values({
          telegramUserId: input.telegramUserId,
          displayName: input.displayName,
          isRegistered: false,
          isBlocked: true,
          blockedReason: input.blockedReason ?? "manual",
          blockedAt: sql`now()`,
          dailyReportEnabled: false
        })
        .onConflictDoUpdate({
          target: users.telegramUserId,
          set: updateSet
        })
        .returning();

      return upserted ?? null;
    }

    const [updated] = await this.db
      .update(users)
      .set(updateSet)
      .where(eq(users.telegramUserId, input.telegramUserId))
      .returning();

    return updated ?? null;
  }

  async updateReportSettings(
    input: UpdateUserReportSettingsInput
  ): Promise<UserRecord> {
    const updateSet: Record<string, unknown> = {
      updatedAt: sql`now()`
    };

    if (input.dailyReportEnabled !== undefined) {
      updateSet.dailyReportEnabled = input.dailyReportEnabled;
    }

    if (input.dailyReportHour !== undefined) {
      updateSet.dailyReportHour = input.dailyReportHour;
    }

    if (input.dailyReportMinute !== undefined) {
      updateSet.dailyReportMinute = input.dailyReportMinute;
    }

    if (input.timezone !== undefined) {
      updateSet.timezone = input.timezone;
    }

    if (input.reportDetailLevel !== undefined) {
      updateSet.reportDetailLevel = input.reportDetailLevel;
    }

    if (input.includePublicBriefingLink !== undefined) {
      updateSet.includePublicBriefingLink = input.includePublicBriefingLink;
    }

    const [updated] = await this.db
      .update(users)
      .set(updateSet)
      .where(eq(users.telegramUserId, input.telegramUserId))
      .returning();

    if (!updated) {
      throw new Error("Failed to update user report settings");
    }

    return updated;
  }

  async upsert(input: UpsertUserInput): Promise<UserRecord> {
    const updateSet: Record<string, unknown> = {
      displayName: input.displayName,
      isRegistered: true,
      locale: input.locale ?? "ko-KR",
      timezone: input.timezone ?? "Asia/Seoul",
      dailyReportEnabled: input.dailyReportEnabled ?? true,
      dailyReportHour: input.dailyReportHour ?? 8,
      dailyReportMinute: input.dailyReportMinute ?? 0,
      reportDetailLevel: input.reportDetailLevel ?? "standard",
      includePublicBriefingLink: input.includePublicBriefingLink ?? true,
      unregisteredAt: null,
      updatedAt: sql`now()`
    };

    if (input.preferredDeliveryChatId !== undefined) {
      updateSet.preferredDeliveryChatId = input.preferredDeliveryChatId;
    }

    if (input.preferredDeliveryChatType !== undefined) {
      updateSet.preferredDeliveryChatType = input.preferredDeliveryChatType;
    }

    const [result] = await this.db
      .insert(users)
      .values({
        telegramUserId: input.telegramUserId,
        preferredDeliveryChatId: input.preferredDeliveryChatId,
        preferredDeliveryChatType: input.preferredDeliveryChatType,
        displayName: input.displayName,
        isRegistered: true,
        locale: input.locale ?? "ko-KR",
        timezone: input.timezone ?? "Asia/Seoul",
        dailyReportEnabled: input.dailyReportEnabled ?? true,
        dailyReportHour: input.dailyReportHour ?? 8,
        dailyReportMinute: input.dailyReportMinute ?? 0,
        reportDetailLevel: input.reportDetailLevel ?? "standard",
        includePublicBriefingLink: input.includePublicBriefingLink ?? true
      })
      .onConflictDoUpdate({
        target: users.telegramUserId,
        set: updateSet
      })
      .returning();

    if (!result) {
      throw new Error("Failed to upsert user");
    }

    return result;
  }
}
