import { and, asc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import {
  marketWatchCatalogItems,
  type MarketWatchCatalogItemRecord,
  userMarketWatchItems,
  type UserMarketWatchItemRecord
} from "./schema.js";

export type AddCustomUserMarketWatchItemInput = {
  assetType: string;
  itemCode: string;
  itemName: string;
  sourceKey: string;
  userId: string;
};

export type EffectiveUserMarketWatchItem = {
  assetType: string;
  isDefault: boolean;
  itemCode: string;
  itemName: string;
  sortOrder: number;
  sourceKey: string;
  userId: string;
};

export class UserMarketWatchItemRepository {
  constructor(private readonly db: DatabaseClient) {}

  async listOverridesByUserId(userId: string): Promise<UserMarketWatchItemRecord[]> {
    return this.db
      .select()
      .from(userMarketWatchItems)
      .where(eq(userMarketWatchItems.userId, userId))
      .orderBy(
        asc(userMarketWatchItems.isCustom),
        asc(userMarketWatchItems.itemCode)
      );
  }

  async addCustomItem(
    input: AddCustomUserMarketWatchItemInput
  ): Promise<UserMarketWatchItemRecord> {
    const defaultItem = await this.findDefaultCatalogItem(input.itemCode);

    if (defaultItem) {
      throw new Error("Cannot add a custom market watch item that already exists in default catalog");
    }

    const [result] = await this.db
      .insert(userMarketWatchItems)
      .values({
        userId: input.userId,
        itemCode: input.itemCode,
        itemName: input.itemName,
        assetType: input.assetType,
        sourceKey: input.sourceKey,
        isActive: true,
        isCustom: true
      })
      .onConflictDoUpdate({
        target: [userMarketWatchItems.userId, userMarketWatchItems.itemCode],
        set: {
          itemName: input.itemName,
          assetType: input.assetType,
          sourceKey: input.sourceKey,
          isActive: true,
          isCustom: true,
          updatedAt: sql`now()`
        }
      })
      .returning();

    if (!result) {
      throw new Error("Failed to add custom market watch item");
    }

    return result;
  }

  async hideDefaultItem(userId: string, itemCode: string): Promise<UserMarketWatchItemRecord> {
    const defaultItem = await this.findDefaultCatalogItem(itemCode);

    if (!defaultItem) {
      throw new Error("Cannot hide a market watch item that is not in default catalog");
    }

    const [result] = await this.db
      .insert(userMarketWatchItems)
      .values({
        userId,
        itemCode,
        isActive: false,
        isCustom: false
      })
      .onConflictDoUpdate({
        target: [userMarketWatchItems.userId, userMarketWatchItems.itemCode],
        set: {
          isActive: false,
          isCustom: false,
          updatedAt: sql`now()`
        }
      })
      .returning();

    if (!result) {
      throw new Error("Failed to hide default market watch item");
    }

    return result;
  }

  async showDefaultItem(userId: string, itemCode: string): Promise<UserMarketWatchItemRecord> {
    const defaultItem = await this.findDefaultCatalogItem(itemCode);

    if (!defaultItem) {
      throw new Error("Cannot show a market watch item that is not in default catalog");
    }

    const [result] = await this.db
      .insert(userMarketWatchItems)
      .values({
        userId,
        itemCode,
        isActive: true,
        isCustom: false
      })
      .onConflictDoUpdate({
        target: [userMarketWatchItems.userId, userMarketWatchItems.itemCode],
        set: {
          isActive: true,
          isCustom: false,
          updatedAt: sql`now()`
        }
      })
      .returning();

    if (!result) {
      throw new Error("Failed to restore default market watch item");
    }

    return result;
  }

  async removeCustomItem(userId: string, itemCode: string): Promise<boolean> {
    const result = await this.db
      .delete(userMarketWatchItems)
      .where(
        and(
          eq(userMarketWatchItems.userId, userId),
          eq(userMarketWatchItems.itemCode, itemCode),
          eq(userMarketWatchItems.isCustom, true)
        )
      )
      .returning({
        id: userMarketWatchItems.id
      });

    return result.length > 0;
  }

  async listEffectiveByUserId(userId: string): Promise<EffectiveUserMarketWatchItem[]> {
    const [defaults, overrides] = await Promise.all([
      this.db
        .select()
        .from(marketWatchCatalogItems)
        .where(eq(marketWatchCatalogItems.isDefault, true))
        .orderBy(
          asc(marketWatchCatalogItems.sortOrder),
          asc(marketWatchCatalogItems.itemCode)
        ),
      this.listOverridesByUserId(userId)
    ]);

    const overrideByCode = new Map(overrides.map((item) => [item.itemCode, item]));

    const visibleDefaults = defaults
      .filter((item) => {
        const override = overrideByCode.get(item.itemCode);

        return override?.isActive !== false;
      })
      .map((item) => ({
        userId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        assetType: item.assetType,
        sourceKey: item.sourceKey,
        sortOrder: item.sortOrder,
        isDefault: true
      }));

    const customItems = overrides
      .filter((item) => item.isCustom && item.isActive)
      .map((item, index) => ({
        userId,
        itemCode: item.itemCode,
        itemName: item.itemName ?? item.itemCode,
        assetType: item.assetType ?? "custom",
        sourceKey: item.sourceKey ?? item.itemCode,
        sortOrder: 1000 + index,
        isDefault: false
      }));

    return [...visibleDefaults, ...customItems];
  }

  private async findDefaultCatalogItem(itemCode: string): Promise<MarketWatchCatalogItemRecord | null> {
    const result = await this.db
      .select()
      .from(marketWatchCatalogItems)
      .where(eq(marketWatchCatalogItems.itemCode, itemCode))
      .limit(1);

    return result[0] ?? null;
  }
}
