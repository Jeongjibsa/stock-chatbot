import { and, desc, eq, lt, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  personalRebalancingSnapshots,
  type PersonalRebalancingSnapshotRecord
} from "./schema.js";

export type UpsertPersonalRebalancingSnapshotInput = {
  effectiveReportDate: string;
  krSessionDate?: string | null;
  payload: Record<string, unknown>;
  requestedSeoulDate: string;
  snapshotVersion: string;
  usSessionDate?: string | null;
  userId: string;
};

export class PersonalRebalancingSnapshotRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByUserAndEffectiveDate(input: {
    effectiveReportDate: string;
    snapshotVersion: string;
    userId: string;
  }): Promise<PersonalRebalancingSnapshotRecord | null> {
    const result = await this.db
      .select()
      .from(personalRebalancingSnapshots)
      .where(
        and(
          eq(personalRebalancingSnapshots.userId, input.userId),
          eq(
            personalRebalancingSnapshots.effectiveReportDate,
            input.effectiveReportDate
          ),
          eq(personalRebalancingSnapshots.snapshotVersion, input.snapshotVersion)
        )
      )
      .orderBy(desc(personalRebalancingSnapshots.updatedAt))
      .limit(1);

    return result[0] ?? null;
  }

  async upsert(
    input: UpsertPersonalRebalancingSnapshotInput
  ): Promise<PersonalRebalancingSnapshotRecord> {
    const [result] = await this.db
      .insert(personalRebalancingSnapshots)
      .values({
        userId: input.userId,
        requestedSeoulDate: input.requestedSeoulDate,
        effectiveReportDate: input.effectiveReportDate,
        ...(input.krSessionDate ? { krSessionDate: input.krSessionDate } : {}),
        ...(input.usSessionDate ? { usSessionDate: input.usSessionDate } : {}),
        snapshotVersion: input.snapshotVersion,
        payload: input.payload
      })
      .onConflictDoUpdate({
        target: [
          personalRebalancingSnapshots.userId,
          personalRebalancingSnapshots.effectiveReportDate,
          personalRebalancingSnapshots.snapshotVersion
        ],
        set: {
          requestedSeoulDate: input.requestedSeoulDate,
          krSessionDate: input.krSessionDate ?? null,
          usSessionDate: input.usSessionDate ?? null,
          payload: input.payload,
          updatedAt: sql`now()`
        }
      })
      .returning();

    if (!result) {
      throw new Error("Failed to upsert personal rebalancing snapshot");
    }

    return result;
  }

  async deleteOlderThan(cutoffDate: string): Promise<number> {
    const deleted = await this.db
      .delete(personalRebalancingSnapshots)
      .where(lt(personalRebalancingSnapshots.effectiveReportDate, cutoffDate))
      .returning({ id: personalRebalancingSnapshots.id });

    return deleted.length;
  }
}
