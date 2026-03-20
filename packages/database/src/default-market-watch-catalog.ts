export type DefaultMarketWatchCatalogItem = {
  assetType: string;
  itemCode: string;
  itemName: string;
  sortOrder: number;
  sourceKey: string;
};

export const DEFAULT_MARKET_WATCH_CATALOG: DefaultMarketWatchCatalogItem[] = [
  {
    itemCode: "KOSPI",
    itemName: "코스피",
    assetType: "index",
    sourceKey: "index:KRX:KOSPI",
    sortOrder: 10
  },
  {
    itemCode: "KOSDAQ",
    itemName: "코스닥",
    assetType: "index",
    sourceKey: "index:KRX:KOSDAQ",
    sortOrder: 20
  },
  {
    itemCode: "NASDAQ",
    itemName: "나스닥 종합",
    assetType: "index",
    sourceKey: "index:NASDAQ:IXIC",
    sortOrder: 30
  },
  {
    itemCode: "SP500",
    itemName: "S&P 500",
    assetType: "index",
    sourceKey: "index:SP:SPX",
    sortOrder: 40
  },
  {
    itemCode: "DOW",
    itemName: "다우",
    assetType: "index",
    sourceKey: "index:DJI",
    sortOrder: 50
  },
  {
    itemCode: "WTI",
    itemName: "WTI 유가",
    assetType: "commodity",
    sourceKey: "commodity:WTI",
    sortOrder: 60
  },
  {
    itemCode: "HENRY_HUB_NATURAL_GAS",
    itemName: "Henry Hub 천연가스",
    assetType: "commodity",
    sourceKey: "commodity:HENRY_HUB_NATURAL_GAS",
    sortOrder: 70
  },
  {
    itemCode: "USD_KRW",
    itemName: "USD/KRW 환율",
    assetType: "fx",
    sourceKey: "fx:USDKRW",
    sortOrder: 80
  },
  {
    itemCode: "US10Y",
    itemName: "미국 10년물 국채금리",
    assetType: "rate",
    sourceKey: "rate:US10Y",
    sortOrder: 90
  },
  {
    itemCode: "VIX",
    itemName: "VIX",
    assetType: "volatility",
    sourceKey: "index:CBOE:VIX",
    sortOrder: 100
  }
];
