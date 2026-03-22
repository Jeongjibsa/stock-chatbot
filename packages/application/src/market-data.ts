export type MarketDataSource = "fred" | "yahoo_finance";

export type MarketDataPoint = {
  asOfDate: string;
  changePercent?: number;
  changeValue?: number;
  itemCode: string;
  itemName: string;
  previousValue?: number;
  source: MarketDataSource;
  sourceKey: string;
  value: number;
};

export type MarketDataItemRequest = {
  asOfDate?: string;
  itemCode: string;
  itemName: string;
  sourceKey: string;
};

export type MarketDataFetchResult =
  | {
      data: MarketDataPoint;
      status: "ok";
    }
  | {
      errorCode: "provider_error" | "unsupported_source";
      message: string;
      sourceKey: string;
      status: "error";
    };

export interface MarketDataAdapter {
  fetchMany(items: MarketDataItemRequest[]): Promise<MarketDataFetchResult[]>;
}
