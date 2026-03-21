import { eq } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import { telegramProcessedUpdates } from "./schema.js";

export class TelegramProcessedUpdateRepository {
  constructor(private readonly db: DatabaseClient) {}

  async markProcessed(updateId: string): Promise<boolean> {
    const [created] = await this.db
      .insert(telegramProcessedUpdates)
      .values({
        updateId
      })
      .onConflictDoNothing()
      .returning();

    return created !== undefined;
  }

  async getByUpdateId(updateId: string) {
    const result = await this.db
      .select()
      .from(telegramProcessedUpdates)
      .where(eq(telegramProcessedUpdates.updateId, updateId))
      .limit(1);

    return result[0] ?? null;
  }
}
