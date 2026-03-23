import { and, asc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  portfolioHoldings,
  type PortfolioHoldingRecord
} from "./schema.js";

export type UpsertPortfolioHoldingInput = {
  avgPrice?: string;
  companyName: string;
  exchange: string;
  note?: string;
  quantity?: string;
  symbol: string;
  userId: string;
};

export class PortfolioHoldingRepository {
  constructor(private readonly db: DatabaseClient) {}

  async listByUserId(userId: string): Promise<PortfolioHoldingRecord[]> {
    return this.db
      .select()
      .from(portfolioHoldings)
      .where(eq(portfolioHoldings.userId, userId))
      .orderBy(
        asc(portfolioHoldings.exchange),
        asc(portfolioHoldings.symbol)
      );
  }

  async getByUserAndSymbol(
    userId: string,
    symbol: string,
    exchange: string
  ): Promise<PortfolioHoldingRecord | null> {
    const result = await this.db
      .select()
      .from(portfolioHoldings)
      .where(
        and(
          eq(portfolioHoldings.userId, userId),
          eq(portfolioHoldings.symbol, symbol),
          eq(portfolioHoldings.exchange, exchange)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async upsert(
    input: UpsertPortfolioHoldingInput
  ): Promise<PortfolioHoldingRecord> {
    const [result] = await this.db
      .insert(portfolioHoldings)
      .values({
        userId: input.userId,
        symbol: input.symbol,
        exchange: input.exchange,
        companyName: input.companyName,
        avgPrice: input.avgPrice,
        quantity: input.quantity,
        note: input.note
      })
      .onConflictDoUpdate({
        target: [
          portfolioHoldings.userId,
          portfolioHoldings.symbol,
          portfolioHoldings.exchange
        ],
        set: {
          companyName: input.companyName,
          avgPrice: input.avgPrice,
          quantity: input.quantity,
          note: input.note,
          updatedAt: sql`now()`
        }
      })
      .returning();

    if (!result) {
      throw new Error("Failed to upsert portfolio holding");
    }

    return result;
  }

  async remove(
    userId: string,
    symbol: string,
    exchange: string
  ): Promise<boolean> {
    const result = await this.db
      .delete(portfolioHoldings)
      .where(
        and(
          eq(portfolioHoldings.userId, userId),
          eq(portfolioHoldings.symbol, symbol),
          eq(portfolioHoldings.exchange, exchange)
        )
      )
      .returning({
        id: portfolioHoldings.id
      });

    return result.length > 0;
  }

  async clearByUserId(userId: string): Promise<number> {
    const deleted = await this.db
      .delete(portfolioHoldings)
      .where(eq(portfolioHoldings.userId, userId))
      .returning({
        id: portfolioHoldings.id
      });

    return deleted.length;
  }
}
