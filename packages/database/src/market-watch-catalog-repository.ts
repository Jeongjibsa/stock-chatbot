import { asc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  DEFAULT_MARKET_WATCH_CATALOG,
  type DefaultMarketWatchCatalogItem
} from "./default-market-watch-catalog.js";
import {
  marketWatchCatalogItems,
  type MarketWatchCatalogItemRecord
} from "./schema.js";

export class MarketWatchCatalogRepository {
  constructor(private readonly db: DatabaseClient) {}

  async listDefaults(): Promise<MarketWatchCatalogItemRecord[]> {
    return this.db
      .select()
      .from(marketWatchCatalogItems)
      .where(eq(marketWatchCatalogItems.isDefault, true))
      .orderBy(asc(marketWatchCatalogItems.sortOrder), asc(marketWatchCatalogItems.itemCode));
  }

  async seedDefaults(
    items: DefaultMarketWatchCatalogItem[] = DEFAULT_MARKET_WATCH_CATALOG
  ): Promise<MarketWatchCatalogItemRecord[]> {
    await this.db
      .insert(marketWatchCatalogItems)
      .values(
        items.map((item) => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          assetType: item.assetType,
          sourceKey: item.sourceKey,
          sortOrder: item.sortOrder,
          isDefault: true
        }))
      )
      .onConflictDoUpdate({
        target: marketWatchCatalogItems.itemCode,
        set: {
          itemName: sql`excluded.item_name`,
          assetType: sql`excluded.asset_type`,
          sourceKey: sql`excluded.source_key`,
          sortOrder: sql`excluded.sort_order`,
          isDefault: true,
          updatedAt: sql`now()`
        }
      });

    return this.listDefaults();
  }
}
