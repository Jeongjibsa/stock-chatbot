export type SupportedExchange = "KR" | "US";

export type PortfolioTickerResolution = {
  companyName: string;
  confidence: "high" | "medium";
  exchange: SupportedExchange;
  matchedBy: "alias" | "symbol";
  symbol: string;
};

export type MarketIndicatorResolution = {
  assetType: string;
  confidence: "high" | "medium";
  itemCode: string;
  itemName: string;
  matchedBy: "alias" | "itemCode";
  sourceKey: string;
};

type PortfolioTickerDefinition = {
  aliases: string[];
  companyName: string;
  exchange: SupportedExchange;
  symbol: string;
};

type MarketIndicatorDefinition = {
  aliases: string[];
  assetType: string;
  itemCode: string;
  itemName: string;
  sourceKey: string;
};

const PORTFOLIO_TICKER_DEFINITIONS: PortfolioTickerDefinition[] = [
  {
    symbol: "005930",
    exchange: "KR",
    companyName: "Samsung Electronics",
    aliases: ["005930", "삼성전자", "samsung electronics", "samsung"]
  },
  {
    symbol: "000660",
    exchange: "KR",
    companyName: "SK hynix",
    aliases: ["000660", "sk하이닉스", "sk hynix", "hynix"]
  },
  {
    symbol: "AAPL",
    exchange: "US",
    companyName: "Apple Inc.",
    aliases: ["aapl", "apple", "애플"]
  },
  {
    symbol: "MSFT",
    exchange: "US",
    companyName: "Microsoft Corporation",
    aliases: ["msft", "microsoft", "마이크로소프트"]
  },
  {
    symbol: "NVDA",
    exchange: "US",
    companyName: "NVIDIA Corporation",
    aliases: ["nvda", "nvidia", "엔비디아"]
  },
  {
    symbol: "TSLA",
    exchange: "US",
    companyName: "Tesla, Inc.",
    aliases: ["tsla", "tesla", "테슬라"]
  }
];

const MARKET_INDICATOR_DEFINITIONS: MarketIndicatorDefinition[] = [
  {
    itemCode: "KOSPI",
    itemName: "코스피",
    assetType: "index",
    sourceKey: "index:KRX:KOSPI",
    aliases: ["kospi", "코스피"]
  },
  {
    itemCode: "KOSDAQ",
    itemName: "코스닥",
    assetType: "index",
    sourceKey: "index:KRX:KOSDAQ",
    aliases: ["kosdaq", "코스닥"]
  },
  {
    itemCode: "NASDAQ",
    itemName: "나스닥 종합",
    assetType: "index",
    sourceKey: "index:NASDAQ:IXIC",
    aliases: ["nasdaq", "nasdaq composite", "나스닥", "나스닥종합"]
  },
  {
    itemCode: "SP500",
    itemName: "S&P 500",
    assetType: "index",
    sourceKey: "index:SP:SPX",
    aliases: ["sp500", "s&p500", "s&p 500", "spx"]
  },
  {
    itemCode: "DOW",
    itemName: "다우",
    assetType: "index",
    sourceKey: "index:DJI",
    aliases: ["dow", "dow jones", "다우", "다우존스"]
  },
  {
    itemCode: "WTI",
    itemName: "국제 유가 (WTI)",
    assetType: "commodity",
    sourceKey: "commodity:WTI",
    aliases: ["wti", "유가", "국제유가", "국제 유가", "원유", "wti유가"]
  },
  {
    itemCode: "HENRY_HUB_NATURAL_GAS",
    itemName: "천연가스 (Henry Hub)",
    assetType: "commodity",
    sourceKey: "commodity:HENRY_HUB_NATURAL_GAS",
    aliases: [
      "henry hub",
      "henry hub natural gas",
      "천연가스",
      "헨리허브천연가스",
      "헨리허브 가스",
      "natural gas"
    ]
  },
  {
    itemCode: "COPPER",
    itemName: "구리",
    assetType: "commodity",
    sourceKey: "commodity:COPPER",
    aliases: ["copper", "구리", "구리시세", "구리 가격"]
  },
  {
    itemCode: "USD_KRW",
    itemName: "USD/KRW 환율",
    assetType: "fx",
    sourceKey: "fx:USDKRW",
    aliases: ["usdkrw", "usd/krw", "환율", "원달러환율", "달러원환율"]
  },
  {
    itemCode: "DXY",
    itemName: "달러인덱스",
    assetType: "fx",
    sourceKey: "index:DXY",
    aliases: ["dxy", "달러인덱스", "dollar index", "달러지수"]
  },
  {
    itemCode: "US10Y",
    itemName: "미국 10년물 국채금리",
    assetType: "rate",
    sourceKey: "rate:US10Y",
    aliases: ["us10y", "미국10년물", "미국10년물국채금리", "10년물금리"]
  },
  {
    itemCode: "VIX",
    itemName: "VIX",
    assetType: "volatility",
    sourceKey: "index:CBOE:VIX",
    aliases: ["vix", "변동성지수", "공포지수"]
  }
];

export class StaticInstrumentResolver {
  resolvePortfolioTicker(
    query: string,
    preferredExchange?: SupportedExchange
  ): PortfolioTickerResolution | null {
    const normalizedQuery = normalizeLookupValue(query);

    if (!normalizedQuery) {
      return null;
    }

    const candidates = preferredExchange
      ? PORTFOLIO_TICKER_DEFINITIONS.filter((item) => item.exchange === preferredExchange)
      : PORTFOLIO_TICKER_DEFINITIONS;

    const symbolMatch = candidates.find(
      (item) => normalizeLookupValue(item.symbol) === normalizedQuery
    );

    if (symbolMatch) {
      return {
        symbol: symbolMatch.symbol,
        exchange: symbolMatch.exchange,
        companyName: symbolMatch.companyName,
        matchedBy: "symbol",
        confidence: "high"
      };
    }

    const aliasMatch = candidates.find((item) =>
      item.aliases.some((alias) => normalizeLookupValue(alias) === normalizedQuery)
    );

    if (!aliasMatch) {
      return null;
    }

    return {
      symbol: aliasMatch.symbol,
      exchange: aliasMatch.exchange,
      companyName: aliasMatch.companyName,
      matchedBy: "alias",
      confidence: "medium"
    };
  }

  resolveMarketIndicator(query: string): MarketIndicatorResolution | null {
    const normalizedQuery = normalizeLookupValue(query);

    if (!normalizedQuery) {
      return null;
    }

    const codeMatch = MARKET_INDICATOR_DEFINITIONS.find(
      (item) => normalizeLookupValue(item.itemCode) === normalizedQuery
    );

    if (codeMatch) {
      return {
        itemCode: codeMatch.itemCode,
        itemName: codeMatch.itemName,
        assetType: codeMatch.assetType,
        sourceKey: codeMatch.sourceKey,
        matchedBy: "itemCode",
        confidence: "high"
      };
    }

    const aliasMatch = MARKET_INDICATOR_DEFINITIONS.find((item) =>
      item.aliases.some((alias) => normalizeLookupValue(alias) === normalizedQuery)
    );

    if (!aliasMatch) {
      return null;
    }

    return {
      itemCode: aliasMatch.itemCode,
      itemName: aliasMatch.itemName,
      assetType: aliasMatch.assetType,
      sourceKey: aliasMatch.sourceKey,
      matchedBy: "alias",
      confidence: "medium"
    };
  }
}

function normalizeLookupValue(value: string): string {
  return value.trim().toUpperCase().replace(/[^\p{L}\p{N}]+/gu, "");
}
