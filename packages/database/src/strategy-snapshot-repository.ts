import { and, desc, eq, inArray } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  strategySnapshots,
  type StrategySnapshotRecord
} from "./schema.js";

export type InsertStrategySnapshotInput = {
  action: string;
  actionSummary: string;
  companyName: string;
  eventScore: string;
  exchange?: string;
  flowScore: string;
  macroScore: string;
  reportRunId: string;
  runDate: string;
  scheduleType: string;
  symbol?: string;
  totalScore: string;
  trendScore: string;
  userId: string;
};

export class StrategySnapshotRepository {
  constructor(private readonly db: DatabaseClient) {}

  async insertMany(
    input: InsertStrategySnapshotInput[]
  ): Promise<StrategySnapshotRecord[]> {
    if (input.length === 0) {
      return [];
    }

    return this.db
      .insert(strategySnapshots)
      .values(
        input.map((snapshot) => ({
          reportRunId: snapshot.reportRunId,
          userId: snapshot.userId,
          runDate: snapshot.runDate,
          scheduleType: snapshot.scheduleType,
          companyName: snapshot.companyName,
          exchange: snapshot.exchange,
          symbol: snapshot.symbol,
          action: snapshot.action,
          actionSummary: snapshot.actionSummary,
          macroScore: snapshot.macroScore,
          trendScore: snapshot.trendScore,
          eventScore: snapshot.eventScore,
          flowScore: snapshot.flowScore,
          totalScore: snapshot.totalScore
        }))
      )
      .returning();
  }

  async listRecent(limit = 20): Promise<StrategySnapshotRecord[]> {
    return this.db
      .select()
      .from(strategySnapshots)
      .orderBy(desc(strategySnapshots.runDate), desc(strategySnapshots.createdAt))
      .limit(limit);
  }

  async listByReportRunId(reportRunId: string): Promise<StrategySnapshotRecord[]> {
    return this.db
      .select()
      .from(strategySnapshots)
      .where(eq(strategySnapshots.reportRunId, reportRunId))
      .orderBy(desc(strategySnapshots.createdAt));
  }

  async listByUserAndRunDateAndScheduleTypes(input: {
    runDate: string;
    scheduleTypes: string[];
    userId: string;
  }): Promise<StrategySnapshotRecord[]> {
    if (input.scheduleTypes.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(strategySnapshots)
      .where(
        and(
          eq(strategySnapshots.userId, input.userId),
          eq(strategySnapshots.runDate, input.runDate),
          inArray(strategySnapshots.scheduleType, input.scheduleTypes)
        )
      )
      .orderBy(desc(strategySnapshots.createdAt));
  }
}
