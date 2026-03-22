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
    try {
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
    } catch (error) {
      if (isMissingSnapshotStorageError(error)) {
        return null;
      }

      throw error;
    }
  }

  async upsert(
    input: UpsertPersonalRebalancingSnapshotInput
  ): Promise<PersonalRebalancingSnapshotRecord | null> {
    try {
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
    } catch (error) {
      if (isMissingSnapshotStorageError(error)) {
        return null;
      }

      throw error;
    }
  }

  async deleteOlderThan(cutoffDate: string): Promise<number> {
    try {
      const deleted = await this.db
        .delete(personalRebalancingSnapshots)
        .where(lt(personalRebalancingSnapshots.effectiveReportDate, cutoffDate))
        .returning({ id: personalRebalancingSnapshots.id });

      return deleted.length;
    } catch (error) {
      if (isMissingSnapshotStorageError(error)) {
        return 0;
      }

      throw error;
    }
  }
}

function isMissingSnapshotStorageError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    code === "42P01" ||
    message.includes('relation "personal_rebalancing_snapshots" does not exist')
  );
}
