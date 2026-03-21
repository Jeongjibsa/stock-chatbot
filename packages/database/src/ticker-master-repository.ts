import {
  desc,
  eq,
  like,
  or,
  sql
} from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  tickerMasters,
  type TickerMasterRecord
} from "./schema.js";

export type UpsertTickerMasterInput = {
  market: string;
  nameEn: string;
  nameKr: string;
  normalizedNameEn: string;
  normalizedNameKr: string;
  normalizedSymbol: string;
  symbol: string;
};

export type SearchTickerCandidate = Pick<
  TickerMasterRecord,
  | "id"
  | "market"
  | "nameEn"
  | "nameKr"
  | "normalizedNameEn"
  | "normalizedNameKr"
  | "normalizedSymbol"
  | "symbol"
> & {
  similarityScore?: number;
};

const UPSERT_CHUNK_SIZE = 500;
const FUZZY_SIMILARITY_THRESHOLD = 0.16;

export class TickerMasterRepository {
  constructor(private readonly db: DatabaseClient) {}

  async count(): Promise<number> {
    const [row] = await this.db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(tickerMasters);

    return row?.count ?? 0;
  }

  async upsertMany(inputs: UpsertTickerMasterInput[]): Promise<number> {
    if (inputs.length === 0) {
      return 0;
    }

    for (let index = 0; index < inputs.length; index += UPSERT_CHUNK_SIZE) {
      const chunk = inputs.slice(index, index + UPSERT_CHUNK_SIZE);

      await this.db
        .insert(tickerMasters)
        .values(chunk)
        .onConflictDoUpdate({
          target: [tickerMasters.symbol, tickerMasters.market],
          set: {
            nameEn: sql`excluded.name_en`,
            nameKr: sql`excluded.name_kr`,
            normalizedNameEn: sql`excluded.normalized_name_en`,
            normalizedNameKr: sql`excluded.normalized_name_kr`,
            normalizedSymbol: sql`excluded.normalized_symbol`,
            updatedAt: sql`now()`
          }
        });
    }

    return inputs.length;
  }

  async findExactSymbol(
    normalizedQuery: string,
    limit = 5
  ): Promise<SearchTickerCandidate[]> {
    return this.db
      .select()
      .from(tickerMasters)
      .where(eq(tickerMasters.normalizedSymbol, normalizedQuery))
      .orderBy(tickerMasters.symbol, tickerMasters.market)
      .limit(limit);
  }

  async findExactName(
    normalizedQuery: string,
    limit = 10
  ): Promise<SearchTickerCandidate[]> {
    return this.db
      .select()
      .from(tickerMasters)
      .where(
        or(
          eq(tickerMasters.normalizedNameKr, normalizedQuery),
          eq(tickerMasters.normalizedNameEn, normalizedQuery)
        )
      )
      .orderBy(tickerMasters.market, tickerMasters.symbol)
      .limit(limit);
  }

  async findPrefixMatches(
    normalizedQuery: string,
    limit = 20
  ): Promise<SearchTickerCandidate[]> {
    const pattern = `${normalizedQuery}%`;

    return this.db
      .select()
      .from(tickerMasters)
      .where(
        or(
          like(tickerMasters.normalizedSymbol, pattern),
          like(tickerMasters.normalizedNameKr, pattern),
          like(tickerMasters.normalizedNameEn, pattern)
        )
      )
      .orderBy(tickerMasters.market, tickerMasters.symbol)
      .limit(limit);
  }

  async findPartialMatches(
    normalizedQuery: string,
    limit = 20
  ): Promise<SearchTickerCandidate[]> {
    const pattern = `%${normalizedQuery}%`;

    return this.db
      .select()
      .from(tickerMasters)
      .where(
        or(
          like(tickerMasters.normalizedSymbol, pattern),
          like(tickerMasters.normalizedNameKr, pattern),
          like(tickerMasters.normalizedNameEn, pattern)
        )
      )
      .orderBy(tickerMasters.market, tickerMasters.symbol)
      .limit(limit);
  }

  async findFuzzyMatches(
    normalizedQuery: string,
    limit = 20
  ): Promise<SearchTickerCandidate[]> {
    const similarityExpression = sql<number>`
      greatest(
        similarity(${tickerMasters.normalizedSymbol}, ${normalizedQuery}),
        similarity(${tickerMasters.normalizedNameEn}, ${normalizedQuery}),
        similarity(${tickerMasters.normalizedNameKr}, ${normalizedQuery}),
        word_similarity(${tickerMasters.normalizedNameEn}, ${normalizedQuery}),
        word_similarity(${tickerMasters.normalizedNameKr}, ${normalizedQuery})
      )
    `;

    return this.db
      .select({
        id: tickerMasters.id,
        symbol: tickerMasters.symbol,
        nameEn: tickerMasters.nameEn,
        nameKr: tickerMasters.nameKr,
        market: tickerMasters.market,
        normalizedSymbol: tickerMasters.normalizedSymbol,
        normalizedNameEn: tickerMasters.normalizedNameEn,
        normalizedNameKr: tickerMasters.normalizedNameKr,
        similarityScore: similarityExpression
      })
      .from(tickerMasters)
      .where(sql`${similarityExpression} >= ${FUZZY_SIMILARITY_THRESHOLD}`)
      .orderBy(desc(similarityExpression), tickerMasters.market, tickerMasters.symbol)
      .limit(limit);
  }
}
