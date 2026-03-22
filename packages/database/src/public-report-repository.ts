import { desc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import { reports, type ReportRecord } from "./schema.js";

export type InsertPublicReportInput = {
  contentMarkdown: string;
  indicatorTags: string[];
  marketRegime: string;
  reportDate: string;
  signals: string[];
  summary: string;
  totalScore: string;
};

export class PublicReportRepository {
  constructor(private readonly db: DatabaseClient) {}

  async insertReport(input: InsertPublicReportInput): Promise<ReportRecord> {
    const existing = await this.findLatestByReportDate(input.reportDate);
    const values = {
      reportDate: input.reportDate,
      summary: input.summary,
      marketRegime: input.marketRegime,
      totalScore: input.totalScore,
      signals: input.signals,
      indicatorTags: input.indicatorTags,
      contentMarkdown: input.contentMarkdown
    };
    const [created] = existing
      ? await this.db
          .update(reports)
          .set({
            ...values,
            createdAt: sql`now()`
          })
          .where(eq(reports.id, existing.id))
          .returning()
      : await this.db.insert(reports).values(values).returning();

    if (!created) {
      throw new Error("Failed to insert public report");
    }

    return created;
  }

  async listReports(): Promise<ReportRecord[]> {
    try {
      return await this.db
        .select()
        .from(reports)
        .orderBy(desc(reports.reportDate), desc(reports.createdAt));
    } catch (error) {
      if (!isMissingIndicatorTagsError(error)) {
        throw error;
      }

      return this.db
        .select({
          id: reports.id,
          reportDate: reports.reportDate,
          summary: reports.summary,
          marketRegime: reports.marketRegime,
          totalScore: reports.totalScore,
          signals: reports.signals,
          contentMarkdown: reports.contentMarkdown,
          createdAt: reports.createdAt
        })
        .from(reports)
        .orderBy(desc(reports.reportDate), desc(reports.createdAt))
        .then((rows) => rows.map((row) => ({ ...row, indicatorTags: [] } as ReportRecord)));
    }
  }

  async getReportById(id: string): Promise<ReportRecord | null> {
    try {
      const result = await this.db
        .select()
        .from(reports)
        .where(eq(reports.id, id))
        .limit(1);

      return result[0] ?? null;
    } catch (error) {
      if (!isMissingIndicatorTagsError(error)) {
        throw error;
      }

      const result = await this.db
        .select({
          id: reports.id,
          reportDate: reports.reportDate,
          summary: reports.summary,
          marketRegime: reports.marketRegime,
          totalScore: reports.totalScore,
          signals: reports.signals,
          contentMarkdown: reports.contentMarkdown,
          createdAt: reports.createdAt
        })
        .from(reports)
        .where(eq(reports.id, id))
        .limit(1);

      return result[0]
        ? ({ ...result[0], indicatorTags: [] } as ReportRecord)
        : null;
    }
  }

  async findLatestByReportDate(reportDate: string): Promise<ReportRecord | null> {
    try {
      const result = await this.db
        .select()
        .from(reports)
        .where(eq(reports.reportDate, reportDate))
        .orderBy(desc(reports.createdAt))
        .limit(1);

      return result[0] ?? null;
    } catch (error) {
      if (!isMissingIndicatorTagsError(error)) {
        throw error;
      }

      const result = await this.db
        .select({
          id: reports.id,
          reportDate: reports.reportDate,
          summary: reports.summary,
          marketRegime: reports.marketRegime,
          totalScore: reports.totalScore,
          signals: reports.signals,
          contentMarkdown: reports.contentMarkdown,
          createdAt: reports.createdAt
        })
        .from(reports)
        .where(eq(reports.reportDate, reportDate))
        .orderBy(desc(reports.createdAt))
        .limit(1);

      return result[0]
        ? ({ ...result[0], indicatorTags: [] } as ReportRecord)
        : null;
    }
  }
}

function isMissingIndicatorTagsError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    code === "42703" ||
    message.includes('column "indicator_tags" does not exist')
  );
}
