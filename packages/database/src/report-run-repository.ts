import { and, desc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import { reportRuns, type ReportRunRecord } from "./schema.js";

export type ReportRunStatus =
  | "completed"
  | "failed"
  | "partial_success"
  | "running";

export type StartReportRunInput = {
  promptVersion?: string;
  runDate: string;
  scheduleType: string;
  skillVersion?: string;
  userId: string;
};

export type CompleteReportRunInput = {
  errorMessage?: string;
  id: string;
  reportText?: string;
  status: Exclude<ReportRunStatus, "running">;
};

const STALE_RUNNING_RUN_MINUTES = 3;

export class ReportRunRepository {
  constructor(private readonly db: DatabaseClient) {}

  async startRun(
    input: StartReportRunInput
  ): Promise<{ created: boolean; run: ReportRunRecord }> {
    const [created] = await this.db
      .insert(reportRuns)
      .values({
        userId: input.userId,
        runDate: input.runDate,
        scheduleType: input.scheduleType,
        status: "running",
        promptVersion: input.promptVersion,
        skillVersion: input.skillVersion
      })
      .onConflictDoNothing()
      .returning();

    if (created) {
      return {
        created: true,
        run: created
      };
    }

    const existing = await this.findByUserAndRunDate(
      input.userId,
      input.runDate,
      input.scheduleType
    );

    if (!existing) {
      throw new Error("Failed to resolve existing report run after conflict");
    }

    if (this.canRestartExistingRun(existing)) {
      const restarted = await this.restartStaleRun(existing.id, input);

      return {
        created: true,
        run: restarted
      };
    }

    return {
      created: false,
      run: existing
    };
  }

  async completeRun(input: CompleteReportRunInput): Promise<ReportRunRecord> {
    const [updated] = await this.db
      .update(reportRuns)
      .set({
        status: input.status,
        reportText: input.reportText,
        errorMessage: input.errorMessage,
        completedAt: sql`now()`
      })
      .where(eq(reportRuns.id, input.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to complete report run");
    }

    return updated;
  }

  async listRecentByUserId(userId: string): Promise<ReportRunRecord[]> {
    return this.db
      .select()
      .from(reportRuns)
      .where(eq(reportRuns.userId, userId))
      .orderBy(desc(reportRuns.startedAt));
  }

  async findByUserAndRunDate(
    userId: string,
    runDate: string,
    scheduleType: string
  ): Promise<ReportRunRecord | null> {
    const result = await this.db
      .select()
      .from(reportRuns)
      .where(
        and(
          eq(reportRuns.userId, userId),
          eq(reportRuns.runDate, runDate),
          eq(reportRuns.scheduleType, scheduleType)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  private isStaleRunningRun(run: ReportRunRecord): boolean {
    if (run.status !== "running") {
      return false;
    }

    if (!run.startedAt) {
      return false;
    }

    const startedAtTime = new Date(run.startedAt).valueOf();

    if (!Number.isFinite(startedAtTime)) {
      return false;
    }

    return Date.now() - startedAtTime >= STALE_RUNNING_RUN_MINUTES * 60_000;
  }

  private canRestartExistingRun(run: ReportRunRecord): boolean {
    if (this.isStaleRunningRun(run)) {
      return true;
    }

    return run.status !== "running" && run.status !== "completed" && !run.reportText;
  }

  private async restartStaleRun(
    runId: string,
    input: StartReportRunInput
  ): Promise<ReportRunRecord> {
    const [updated] = await this.db
      .update(reportRuns)
      .set({
        status: "running",
        reportText: null,
        errorMessage: null,
        promptVersion: input.promptVersion,
        skillVersion: input.skillVersion,
        startedAt: sql`now()`,
        completedAt: null
      })
      .where(eq(reportRuns.id, runId))
      .returning();

    if (!updated) {
      throw new Error("Failed to restart stale report run");
    }

    return updated;
  }
}
