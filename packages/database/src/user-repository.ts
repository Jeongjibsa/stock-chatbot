import { desc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import { users, type UserRecord } from "./schema.js";

export type UpsertUserInput = {
  displayName: string;
  locale?: string;
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

  async upsert(input: UpsertUserInput): Promise<UserRecord> {
    const [result] = await this.db
      .insert(users)
      .values({
        telegramUserId: input.telegramUserId,
        displayName: input.displayName,
        locale: input.locale ?? "ko-KR",
        timezone: input.timezone ?? "Asia/Seoul"
      })
      .onConflictDoUpdate({
        target: users.telegramUserId,
        set: {
          displayName: input.displayName,
          locale: input.locale ?? "ko-KR",
          timezone: input.timezone ?? "Asia/Seoul",
          updatedAt: sql`now()`
        }
      })
      .returning();

    if (!result) {
      throw new Error("Failed to upsert user");
    }

    return result;
  }
}

