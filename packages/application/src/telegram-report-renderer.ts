import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief } from "./news.js";

export type TelegramReportRenderInput = {
  eventBullets?: string[];
  displayName: string;
  fundFlowBullets?: string[];
  macroBullets?: string[];
  marketBullets?: string[];
  articleSummaryBullets?: string[];
  holdings: Array<{
    companyName: string;
    currentPrice?: number;
    exchange: string;
    previousClose?: number;
    symbol: string;
    trendSummary?: string;
    changePercent?: number;
  }>;
  holdingTrendBullets?: string[];
  keyIndicatorSummaries?: string[];
  marketResults: MarketDataFetchResult[];
  portfolioNewsBriefs?: HoldingNewsBrief[];
  quantScenarios?: string[];
  riskCheckpoints?: string[];
  runDate: string;
  summaryLine?: string;
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
    "🗞️ 오늘의 브리핑",
    "",
    `📌 한 줄 요약`,
    buildSummaryLine(
      successfulMarketItems.length,
      failedMarketItems.length,
      input.holdings.length,
      input.summaryLine
    ),
    "",
    "🌍 거시 시장 스냅샷",
    ...renderMarketSnapshot(successfulMarketItems),
    "",
    "📊 시장 브리핑",
    ...renderCustomBulletSection(input.marketBullets, [
      "S&P500, NASDAQ, KOSPI, KOSDAQ, DOW, VIX 해석 데이터가 아직 충분하지 않습니다."
    ]),
    "",
    "🏦 매크로 브리핑",
    ...renderMacroSection(
      successfulMarketItems,
      input.macroBullets,
      input.keyIndicatorSummaries
    ),
    "",
    "💸 자금 브리핑",
    ...renderCustomBulletSection(input.fundFlowBullets, [
      "외국인·기관 수급과 ETF flow 데이터가 아직 연결되지 않았습니다."
    ]),
    "",
    "🗓️ 주요 일정 및 이벤트 브리핑",
    ...renderCustomBulletSection(input.eventBullets, [
      "주요 뉴스, 예정 실적, 지정학 리스크, AI·반도체·원자재 이벤트 데이터가 아직 충분하지 않습니다."
    ]),
    "",
    "📈 보유 종목별 최근 동향",
    ...renderHoldings(input.holdings, input.holdingTrendBullets)
  ];

  lines.push(
    "",
    "📰 종목 관련 핵심 기사 요약",
    ...renderPortfolioNews(input.portfolioNewsBriefs, input.articleSummaryBullets)
  );
  lines.push("", "🧠 퀀트 기반 시그널 및 매매 아이디어", ...renderScenarioLines(input.quantScenarios));
  lines.push("", "⚠️ 리스크 체크포인트", ...renderRiskLines(input.riskCheckpoints));

  if (failedMarketItems.length > 0) {
    lines.push("", "🧩 누락 또는 지연 항목", ...renderFailures(failedMarketItems));
  }

  lines.push("", ...renderDisclaimer());

  return lines.join("\n");
}

function buildSummaryLine(
  marketOkCount: number,
  marketErrorCount: number,
  holdingCount: number,
  customSummary?: string
): string {
  if (customSummary) {
    return customSummary;
  }

  if (marketErrorCount === 0) {
    return `시장 지표 ${marketOkCount}개와 보유 종목 ${holdingCount}개 기준으로 정리했습니다.`;
  }

  return `시장 지표 ${marketOkCount}개를 반영했고 ${marketErrorCount}개는 누락됐습니다. 보유 종목 ${holdingCount}개 기준으로 정리했습니다.`;
}

function renderMarketSnapshot(
  results: Array<Extract<MarketDataFetchResult, { status: "ok" }>>
): string[] {
  if (results.length === 0) {
    return ["• 수집된 시장 지표가 아직 없습니다."];
  }

  const lines = [...results]
    .sort(compareMarketSnapshotItems)
    .map((result) => {
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
  holdings: Array<{
    companyName: string;
    currentPrice?: number;
    exchange: string;
    previousClose?: number;
    symbol: string;
    trendSummary?: string;
    changePercent?: number;
  }>,
  customBullets?: string[]
): string[] {
  if (customBullets && customBullets.length > 0) {
    return customBullets.map((bullet) => `• ${bullet}`);
  }

  if (holdings.length === 0) {
    return ["• 등록된 보유 종목이 없습니다."];
  }

  const lines: string[] = [];

  for (const holding of holdings) {
    const transition =
      holding.currentPrice === undefined
        ? undefined
        : formatValueTransition(holding.previousClose, holding.currentPrice);
    const changeText = formatChangeBadge(holding.changePercent);
    const detailText = transition
      ? `: ${transition}${changeText ? `  ${changeText}` : ""}`
      : ": 시세 스냅샷 연결 전입니다";

    lines.push(`• ${holding.companyName} (${holding.symbol}, ${holding.exchange})${detailText}`);

    if (holding.trendSummary) {
      lines.push(`  ${holding.trendSummary}`);
    }
  }

  return lines;
}

function renderFailures(
  results: Array<Extract<MarketDataFetchResult, { status: "error" }>>
): string[] {
  return results.map((result) => `• ${result.sourceKey}: ${result.message}`);
}

function renderPortfolioNews(
  briefs?: HoldingNewsBrief[],
  customBullets?: string[]
): string[] {
  if (customBullets && customBullets.length > 0) {
    return customBullets.map((bullet) => `• ${bullet}`);
  }

  if (!briefs || briefs.length === 0) {
    return ["• 관련 기사 요약이 아직 없습니다."];
  }

  const lines: string[] = [];

  for (const brief of briefs) {
    if (brief.events.length === 0) {
      lines.push(
        `• ${brief.holding.companyName}: ${brief.errorMessage ?? "핵심 이벤트를 찾지 못했습니다."}`
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

function renderScenarioLines(quantScenarios?: string[]): string[] {
  if (!quantScenarios || quantScenarios.length === 0) {
    return ["• 규칙 기반 시그널이 아직 없습니다."];
  }

  return quantScenarios.map((scenario) => `• ${scenario}`);
}

function renderRiskLines(riskCheckpoints?: string[]): string[] {
  if (!riskCheckpoints || riskCheckpoints.length === 0) {
    return ["• 현재 추가 리스크 체크포인트는 없습니다."];
  }

  return riskCheckpoints.map((checkpoint) => `• ${checkpoint}`);
}

function renderMacroSection(
  results: Array<Extract<MarketDataFetchResult, { status: "ok" }>>,
  customBullets?: string[],
  supplementalBullets?: string[]
): string[] {
  const lines = customBullets ? [...customBullets] : [];
  const rankedMovers = [...results]
    .filter((result) => result.data.changePercent !== undefined)
    .sort(
      (left, right) =>
        Math.abs((right.data.changePercent ?? 0)) - Math.abs((left.data.changePercent ?? 0))
    )
    .slice(0, 2);

  for (const mover of rankedMovers) {
    const changePercent = mover.data.changePercent ?? 0;
    const direction = changePercent > 0 ? "상승" : changePercent < 0 ? "하락" : "보합";
    lines.push(
      `• ${mover.data.itemName}이 ${Math.abs(changePercent).toFixed(2)}% ${direction}하며 상대적으로 움직임이 컸습니다.`
    );
  }

  const fxInsight = buildFxInsight(results);

  if (fxInsight) {
    lines.push(fxInsight);
  }

  if (supplementalBullets && supplementalBullets.length > 0) {
    lines.push(...supplementalBullets);
  }

  if (lines.length === 0) {
    return ["• 아직 강조할 만한 지표 변화 요약이 없습니다."];
  }

  return [...new Set(lines)].map((line) => `• ${line}`);
}

function renderCustomBulletSection(
  bullets: string[] | undefined,
  fallbackLines: string[]
): string[] {
  if (!bullets || bullets.length === 0) {
    return fallbackLines.map((line) => `• ${line}`);
  }

  return bullets.map((bullet) => `• ${bullet}`);
}

function renderDisclaimer(): string[] {
  return ["❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다."];
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
      return "원화 약세가 보이지만 달러인덱스가 없어 상대 약세까지는 확정하기 어렵습니다.";
    }

    if (usdKrw.data.changePercent < 0) {
      return "원화 강세가 보이지만 달러인덱스가 없어 달러 전반 약세와의 구분은 제한적입니다.";
    }

    return undefined;
  }

  if (usdKrw.data.changePercent > 0 && dxy.data.changePercent > 0) {
    return "달러인덱스와 USD/KRW가 함께 올라 전반적인 달러 강세 영향이 같이 반영된 흐름으로 보입니다.";
  }

  if (usdKrw.data.changePercent > 0 && dxy.data.changePercent <= 0) {
    return "달러인덱스보다 USD/KRW 상승폭이 더 커 원화 약세 압력이 상대적으로 더 크게 작동한 흐름입니다.";
  }

  if (usdKrw.data.changePercent < 0 && dxy.data.changePercent > 0) {
    return "달러는 강한데 USD/KRW는 내려 원화가 상대적으로 더 견조했던 흐름으로 보입니다.";
  }

  if (usdKrw.data.changePercent < 0 && dxy.data.changePercent <= 0) {
    return "달러 약세와 함께 USD/KRW도 내려 원화 강세가 같이 나타난 흐름으로 보입니다.";
  }

  return "USD/KRW 변동이 제한적이라 원화의 상대 강도 판단은 중립에 가깝습니다.";
}

function compareMarketSnapshotItems(
  left: Extract<MarketDataFetchResult, { status: "ok" }>,
  right: Extract<MarketDataFetchResult, { status: "ok" }>
): number {
  const leftRank = getMarketSnapshotRank(left.data.itemCode);
  const rightRank = getMarketSnapshotRank(right.data.itemCode);

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.data.itemName.localeCompare(right.data.itemName, "ko");
}

function getMarketSnapshotRank(itemCode: string): number {
  switch (itemCode) {
    case "USD_KRW":
      return 98;
    case "DXY":
      return 99;
    default:
      return 0;
  }
}
