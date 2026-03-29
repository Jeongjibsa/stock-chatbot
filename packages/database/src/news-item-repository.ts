import { and, desc, eq, gte } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import { newsItems, type NewsItemRecord } from "./schema.js";

export type InsertNewsItemInput = {
  canonicalUrl: string;
  collectedAt: string;
  companyName?: string;
  contentScope: string;
  newsSourceId: string;
  newsSourceLabel: string;
  normalizedTitle: string;
  publishedAt: string;
  rawPayload: Record<string, unknown>;
  region: string;
  summary?: string;
  symbol?: string;
  title: string;
  url: string;
};

export class NewsItemRepository {
  constructor(private readonly db: DatabaseClient) {}

  async insertMany(input: InsertNewsItemInput[]): Promise<NewsItemRecord[]> {
    if (input.length === 0) {
      return [];
    }

    const records: NewsItemRecord[] = [];

    for (const item of input) {
      const existing = await this.findExisting(item);

      if (existing) {
        records.push(existing);
        continue;
      }

      const [created] = await this.db
        .insert(newsItems)
        .values({
          newsSourceId: item.newsSourceId,
          newsSourceLabel: item.newsSourceLabel,
          contentScope: item.contentScope,
          region: item.region,
          title: item.title,
          normalizedTitle: item.normalizedTitle,
          url: item.url,
          canonicalUrl: item.canonicalUrl,
          publishedAt: new Date(item.publishedAt),
          ...(item.summary ? { summary: item.summary } : {}),
          ...(item.symbol ? { symbol: item.symbol } : {}),
          ...(item.companyName ? { companyName: item.companyName } : {}),
          rawPayload: item.rawPayload,
          collectedAt: new Date(item.collectedAt)
        })
        .returning();

      if (created) {
        records.push(created);
      }
    }

    return records;
  }

  async listRecentByScope(input: {
    contentScope: string;
    since: string;
  }): Promise<NewsItemRecord[]> {
    return this.db
      .select()
      .from(newsItems)
      .where(
        and(
          eq(newsItems.contentScope, input.contentScope),
          gte(newsItems.publishedAt, new Date(input.since))
        )
      )
      .orderBy(desc(newsItems.publishedAt));
  }

  private async findExisting(input: InsertNewsItemInput): Promise<NewsItemRecord | null> {
    const result = await this.db
      .select()
      .from(newsItems)
      .where(
        and(
          eq(newsItems.canonicalUrl, input.canonicalUrl),
          eq(newsItems.publishedAt, new Date(input.publishedAt)),
          eq(newsItems.newsSourceId, input.newsSourceId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }
}
