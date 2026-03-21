import { desc, eq } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import { reports, type ReportRecord } from "./schema.js";

export type InsertPublicReportInput = {
  contentMarkdown: string;
  marketRegime: string;
  reportDate: string;
  signals: string[];
  summary: string;
  totalScore: string;
};

export class PublicReportRepository {
  constructor(private readonly db: DatabaseClient) {}

  async insertReport(input: InsertPublicReportInput): Promise<ReportRecord> {
    const [created] = await this.db
      .insert(reports)
      .values({
        reportDate: input.reportDate,
        summary: input.summary,
        marketRegime: input.marketRegime,
        totalScore: input.totalScore,
        signals: input.signals,
        contentMarkdown: input.contentMarkdown
      })
      .returning();

    if (!created) {
      throw new Error("Failed to insert public report");
    }

    return created;
  }

  async listReports(): Promise<ReportRecord[]> {
    return this.db
      .select()
      .from(reports)
      .orderBy(desc(reports.reportDate), desc(reports.createdAt));
  }

  async getReportById(id: string): Promise<ReportRecord | null> {
    const result = await this.db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  async findLatestByReportDate(reportDate: string): Promise<ReportRecord | null> {
    const result = await this.db
      .select()
      .from(reports)
      .where(eq(reports.reportDate, reportDate))
      .orderBy(desc(reports.createdAt))
      .limit(1);

    return result[0] ?? null;
  }
}
