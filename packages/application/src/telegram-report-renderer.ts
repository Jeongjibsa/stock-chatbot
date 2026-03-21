import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief } from "./news.js";

export type TelegramReportRenderInput = {
  displayName: string;
  holdings: Array<{
    companyName: string;
    exchange: string;
    symbol: string;
  }>;
  marketResults: MarketDataFetchResult[];
  portfolioNewsBriefs?: HoldingNewsBrief[];
  quantScenarios?: string[];
  riskCheckpoints?: string[];
  runDate: string;
};

export function renderTelegramDailyReport(
  input: TelegramReportRenderInput
): string {
  const successfulMarketItems = input.marketResults.filter(
    (result): result is Extract<MarketDataFetchResult, { status: "ok" }> =>
      result.status === "ok"
  );
  const failedMarketItems = input.marketResults.filter(
    (result): result is Extract<MarketDataFetchResult, { status: "error" }> =>
      result.status === "error"
  );

  const lines = [
    `🗞️ 오늘의 브리핑 | ${input.runDate}`,
    "",
    `📌 한 줄 요약`,
    buildSummaryLine(successfulMarketItems.length, failedMarketItems.length, input.holdings.length),
    "",
    "🌍 거시 시장 스냅샷",
    ...renderMarketSnapshot(successfulMarketItems),
    "",
    "🧾 보유 종목",
    ...renderHoldings(input.holdings)
  ];

  if (input.portfolioNewsBriefs && input.portfolioNewsBriefs.length > 0) {
    lines.push("", "📰 보유 종목 뉴스", ...renderPortfolioNews(input.portfolioNewsBriefs));
  }

  if (input.quantScenarios && input.quantScenarios.length > 0) {
    lines.push(
      "",
      "🧠 전략 시나리오",
      ...input.quantScenarios.map((scenario) => `• ${scenario}`)
    );
  }

  if (input.riskCheckpoints && input.riskCheckpoints.length > 0) {
    lines.push(
      "",
      "⚠️ 리스크 체크포인트",
      ...input.riskCheckpoints.map((checkpoint) => `• ${checkpoint}`)
    );
  }

  if (failedMarketItems.length > 0) {
    lines.push("", "🧩 누락 또는 지연 항목", ...renderFailures(failedMarketItems));
  }

  if (
    !input.portfolioNewsBriefs?.length &&
    !input.quantScenarios?.length &&
    !input.riskCheckpoints?.length
  ) {
    lines.push(
      "",
      "ℹ️ 안내",
      "뉴스 요약과 퀀트 시그널은 다음 단계에서 연결 예정이야."
    );
  }

  return lines.join("\n");
}

function buildSummaryLine(
  marketOkCount: number,
  marketErrorCount: number,
  holdingCount: number
): string {
  if (marketErrorCount === 0) {
    return `시장 지표 ${marketOkCount}개와 보유 종목 ${holdingCount}개 기준으로 정리했어.`;
  }

  return `시장 지표 ${marketOkCount}개를 반영했고 ${marketErrorCount}개는 누락됐어. 보유 종목 ${holdingCount}개 기준으로 정리했어.`;
}

function renderMarketSnapshot(
  results: Array<Extract<MarketDataFetchResult, { status: "ok" }>>
): string[] {
  if (results.length === 0) {
    return ["• 수집된 시장 지표가 아직 없어."];
  }

  const lines = results.map((result) => {
    const changeText = formatChangeBadge(result.data.changePercent);
    const valueText = formatValueTransition(
      result.data.previousValue,
      result.data.value
    );

    return `• ${result.data.itemName}: ${valueText}${changeText ? `  ${changeText}` : ""}`;
  });

  const fxInsight = buildFxInsight(results);

  if (fxInsight) {
    lines.push(`  ↳ ${fxInsight}`);
  }

  return lines;
}

function renderHoldings(
  holdings: Array<{ companyName: string; exchange: string; symbol: string }>
): string[] {
  if (holdings.length === 0) {
    return ["• 등록된 보유 종목이 없어."];
  }

  return holdings.map(
    (holding) => `• ${holding.companyName} (${holding.symbol}, ${holding.exchange})`
  );
}

function renderFailures(
  results: Array<Extract<MarketDataFetchResult, { status: "error" }>>
): string[] {
  return results.map((result) => `• ${result.sourceKey}: ${result.message}`);
}

function renderPortfolioNews(briefs: HoldingNewsBrief[]): string[] {
  const lines: string[] = [];

  for (const brief of briefs) {
    if (brief.events.length === 0) {
      lines.push(
        `• ${brief.holding.companyName}: ${brief.errorMessage ?? "핵심 이벤트를 찾지 못했어."}`
      );
      continue;
    }

    for (const event of brief.events.slice(0, 2)) {
      const sentimentBadge = formatSentimentBadge(event.sentiment);
      const confidenceBadge = formatConfidenceBadge(event.confidence);

      lines.push(
        `• ${brief.holding.companyName}: ${sentimentBadge} ${event.headline} ${confidenceBadge}`
      );
      lines.push(`  ${event.summary}`);
    }
  }

  return lines;
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(value);
}

function formatValueTransition(previousValue: number | undefined, value: number): string {
  if (previousValue === undefined) {
    return formatValue(value);
  }

  return `${formatValue(previousValue)} → ${formatValue(value)}`;
}

function formatChangeBadge(value?: number): string {
  if (value === undefined) {
    return "";
  }

  if (value > 0) {
    return `🔴▲ ${value.toFixed(2)}%`;
  }

  if (value < 0) {
    return `🔵▼ ${Math.abs(value).toFixed(2)}%`;
  }

  return `⚪■ 0.00%`;
}

function formatSentimentBadge(sentiment: HoldingNewsBrief["events"][number]["sentiment"]): string {
  if (sentiment === "positive") {
    return "🔴호재";
  }

  if (sentiment === "negative") {
    return "🔵악재";
  }

  return "⚪중립";
}

function formatConfidenceBadge(
  confidence: HoldingNewsBrief["events"][number]["confidence"]
): string {
  if (confidence === "high") {
    return "신뢰도 높음";
  }

  if (confidence === "medium") {
    return "신뢰도 보통";
  }

  return "신뢰도 낮음";
}

function buildFxInsight(
  results: Array<Extract<MarketDataFetchResult, { status: "ok" }>>
): string | undefined {
  const usdKrw = results.find((result) => result.data.itemCode === "USD_KRW");
  const dxy = results.find((result) => result.data.itemCode === "DXY");

  if (!usdKrw || usdKrw.data.changePercent === undefined) {
    return undefined;
  }

  if (!dxy || dxy.data.changePercent === undefined) {
    if (usdKrw.data.changePercent > 0) {
      return "원화 약세가 보이지만 달러인덱스가 없어 상대 약세까지는 확정하기 어려워.";
    }

    if (usdKrw.data.changePercent < 0) {
      return "원화 강세가 보이지만 달러인덱스가 없어 달러 전반 약세와의 구분은 제한적이야.";
    }

    return undefined;
  }

  if (usdKrw.data.changePercent > 0 && dxy.data.changePercent > 0) {
    return "달러인덱스도 함께 올라 원화만 약한 장은 아니고, 달러 강세 영향이 같이 반영되고 있어.";
  }

  if (usdKrw.data.changePercent > 0 && dxy.data.changePercent <= 0) {
    return "달러인덱스 대비로도 USD/KRW가 올라 원화 쪽 약세 압력이 더 크게 작동한 흐름이야.";
  }

  if (usdKrw.data.changePercent < 0 && dxy.data.changePercent > 0) {
    return "달러는 강한데 USD/KRW는 내려 원화가 상대적으로 선방한 흐름이야.";
  }

  if (usdKrw.data.changePercent < 0 && dxy.data.changePercent <= 0) {
    return "달러 약세와 함께 USD/KRW도 내려 원화 강세가 같이 나타난 흐름이야.";
  }

  return "USD/KRW 변동이 제한적이라 원화의 상대 강도 판단은 중립에 가까워.";
}
