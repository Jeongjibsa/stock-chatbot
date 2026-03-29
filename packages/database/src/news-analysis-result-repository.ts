import { and, desc, eq } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  newsAnalysisResults,
  type NewsAnalysisResultRecord
} from "./schema.js";

export type UpsertNewsAnalysisResultInput = {
  analysisType: string;
  audienceScope: string;
  briefingSession: string;
  confidence: string;
  runDate: string;
  sentiment: string;
  subjectKey: string;
  summary: string;
  supportingNewsItemIds: string[];
  tags: string[];
};

export class NewsAnalysisResultRepository {
  constructor(private readonly db: DatabaseClient) {}

  async upsertMany(
    input: UpsertNewsAnalysisResultInput[]
  ): Promise<NewsAnalysisResultRecord[]> {
    const results: NewsAnalysisResultRecord[] = [];

    for (const item of input) {
      const existing = await this.findLatest(item);
      const values = {
        runDate: item.runDate,
        briefingSession: item.briefingSession,
        audienceScope: item.audienceScope,
        analysisType: item.analysisType,
        subjectKey: item.subjectKey,
        summary: item.summary,
        sentiment: item.sentiment,
        confidence: item.confidence,
        tags: item.tags,
        supportingNewsItemIds: item.supportingNewsItemIds
      };
      const [record] = existing
        ? await this.db
            .update(newsAnalysisResults)
            .set(values)
            .where(eq(newsAnalysisResults.id, existing.id))
            .returning()
        : await this.db.insert(newsAnalysisResults).values(values).returning();

      if (record) {
        results.push(record);
      }
    }

    return results;
  }

  async listByRunDateAndSession(input: {
    audienceScope: string;
    briefingSession: string;
    runDate: string;
  }): Promise<NewsAnalysisResultRecord[]> {
    return this.db
      .select()
      .from(newsAnalysisResults)
      .where(
        and(
          eq(newsAnalysisResults.runDate, input.runDate),
          eq(newsAnalysisResults.briefingSession, input.briefingSession),
          eq(newsAnalysisResults.audienceScope, input.audienceScope)
        )
      )
      .orderBy(desc(newsAnalysisResults.createdAt));
  }

  private async findLatest(
    input: UpsertNewsAnalysisResultInput
  ): Promise<NewsAnalysisResultRecord | null> {
    const result = await this.db
      .select()
      .from(newsAnalysisResults)
      .where(
        and(
          eq(newsAnalysisResults.runDate, input.runDate),
          eq(newsAnalysisResults.briefingSession, input.briefingSession),
          eq(newsAnalysisResults.audienceScope, input.audienceScope),
          eq(newsAnalysisResults.analysisType, input.analysisType),
          eq(newsAnalysisResults.subjectKey, input.subjectKey)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }
}
