import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief } from "./news.js";

const SECTION_DIVIDER = "━━━━━━━━━━━━━━━";

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
    `🗞️ 오늘의 브리핑 (${input.runDate} 기준)`,
    "",
    `📌 한 줄 요약`,
    buildSummaryLine(
      successfulMarketItems,
      successfulMarketItems.length,
      failedMarketItems.length,
      input.holdings.length,
      input.summaryLine
    ),
    "",
    SECTION_DIVIDER,
    "🌍 거시 시장 스냅샷",
    ...renderMarketSnapshot(successfulMarketItems),
    "",
    SECTION_DIVIDER,
    "📍 주요 지표 변동 요약",
    ...renderIndicatorSummarySection(
      successfulMarketItems,
      input.keyIndicatorSummaries
    ),
    "",
    SECTION_DIVIDER,
    "📈 보유 종목별 최근 동향",
    ...renderHoldings(input.holdings, input.holdingTrendBullets)
  ];

  lines.push(
    "",
    SECTION_DIVIDER,
    "📰 종목 관련 핵심 기사 및 이벤트 요약",
    ...renderPortfolioNews(input.holdings.length, input.portfolioNewsBriefs, input.articleSummaryBullets)
  );
  lines.push(
    "",
    SECTION_DIVIDER,
    "🧠 퀀트 기반 시그널 및 매매 아이디어",
    ...renderScenarioLines(input.quantScenarios)
  );
  lines.push("", SECTION_DIVIDER, "⚠️ 리스크 체크리스트", ...renderRiskLines(input.riskCheckpoints));
  lines.push(
    "",
    SECTION_DIVIDER,
    "🧭 시장, 매크로, 자금 브리핑",
    ...renderCombinedBriefingSection(
      input.marketBullets,
      input.macroBullets,
      input.fundFlowBullets
    )
  );
  lines.push(
    "",
    SECTION_DIVIDER,
    "🗓️ 주요 일정 및 이벤트 브리핑",
    ...renderCustomBulletSection(input.eventBullets, [
      "주요 뉴스, 예정 실적, 지정학 리스크, AI·반도체·원자재 이벤트 데이터가 아직 충분하지 않습니다."
    ])
  );

  if (failedMarketItems.length > 0) {
    lines.push("", SECTION_DIVIDER, "🧩 누락 또는 지연 항목", ...renderFailures(failedMarketItems));
  }

  lines.push("", SECTION_DIVIDER, ...renderDisclaimer());

  return lines.join("\n");
}

function buildSummaryLine(
  results: Array<Extract<MarketDataFetchResult, { status: "ok" }>>,
  marketOkCount: number,
  marketErrorCount: number,
  holdingCount: number,
  customSummary?: string
): string {
  if (customSummary) {
    return customSummary.startsWith("→") ? customSummary : `→ ${customSummary}`;
  }

  const nasdaq = results.find((result) => result.data.itemCode === "NASDAQ");
  const sp500 = results.find((result) => result.data.itemCode === "SP500");
  const vix = results.find((result) => result.data.itemCode === "VIX");

  if (
    (nasdaq?.data.changePercent ?? 0) < 0 &&
    (sp500?.data.changePercent ?? 0) < 0 &&
    (vix?.data.changePercent ?? 0) > 5
  ) {
    return "→ Risk-Off 재진입 구간으로 보이며, 신규 매수는 보수적으로 접근하시는 편이 좋습니다.";
  }

  if (
    (nasdaq?.data.changePercent ?? 0) > 0 &&
    (sp500?.data.changePercent ?? 0) > 0 &&
    (vix?.data.changePercent ?? 0) < 0
  ) {
    return "→ Risk-On 완화 흐름으로 보이며, 추격 매수보다 선별적 분할 접근이 적절합니다.";
  }

  if (marketErrorCount === 0) {
    return `→ 시장 지표 ${marketOkCount}개와 보유 종목 ${holdingCount}개 기준으로 핵심 대응 포인트를 정리했습니다.`;
  }

  return `→ 시장 지표 ${marketOkCount}개를 반영했고 ${marketErrorCount}개는 누락됐습니다. 보유 종목 ${holdingCount}개 기준으로 대응 포인트를 정리했습니다.`;
}

function renderMarketSnapshot(
  results: Array<Extract<MarketDataFetchResult, { status: "ok" }>>
): string[] {
  if (results.length === 0) {
    return ["• 수집된 시장 지표가 아직 없습니다."];
  }

  const groups = [
    ["NASDAQ", "SP500", "DOW", "VIX"],
    ["KOSPI", "KOSDAQ"],
    ["US10Y", "WTI", "NATGAS", "COPPER"],
    ["USD_KRW", "DXY"]
  ] as const;

  const resultMap = new Map(results.map((result) => [result.data.itemCode, result]));
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const group of groups) {
    const groupLines = group
      .map((itemCode) => resultMap.get(itemCode))
      .filter((result): result is Extract<MarketDataFetchResult, { status: "ok" }> =>
        result !== undefined
      )
      .map((result) => {
        seen.add(result.data.itemCode);
        return renderSnapshotLine(result);
      });

    if (groupLines.length === 0) {
      continue;
    }

    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(...groupLines);
  }

  const remainingLines = results
    .filter((result) => !seen.has(result.data.itemCode))
    .sort((left, right) => left.data.itemName.localeCompare(right.data.itemName, "ko"))
    .map((result) => renderSnapshotLine(result));

  if (remainingLines.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(...remainingLines);
  }

  const fxInsight = buildFxInsight(results);

  if (fxInsight) {
    if (lines.length > 0 && lines[lines.length - 1] !== "") {
      lines.push("");
    }

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
    return ["• (보유 종목 없음)"];
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
  holdingCount: number,
  briefs?: HoldingNewsBrief[],
  customBullets?: string[]
): string[] {
  if (customBullets && customBullets.length > 0) {
    return customBullets.map((bullet) => `• ${bullet}`);
  }

  if (!briefs || briefs.length === 0) {
    return holdingCount === 0
      ? ["• (보유 종목 입력 시 자동 생성)"]
      : ["• 관련 기사 및 이벤트 요약이 아직 없습니다."];
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
    return ["• 규칙 기반 점수 산출 전입니다."];
  }

  return quantScenarios.map((scenario) => `• ${scenario}`);
}

function renderRiskLines(riskCheckpoints?: string[]): string[] {
  if (!riskCheckpoints || riskCheckpoints.length === 0) {
    return ["• 현재 추가 리스크 체크리스트는 없습니다."];
  }

  return riskCheckpoints.map((checkpoint) => `• ${checkpoint}`);
}

function renderIndicatorSummarySection(
  results: Array<Extract<MarketDataFetchResult, { status: "ok" }>>,
  supplementalBullets?: string[]
): string[] {
  const lines: string[] = [];
  const rankedMovers = [...results]
    .filter(
      (result) =>
        result.data.changePercent !== undefined &&
        result.data.itemCode !== "USD_KRW" &&
        result.data.itemCode !== "DXY"
    )
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

  if (supplementalBullets && supplementalBullets.length > 0) {
    lines.push(...supplementalBullets.map((line) => `• ${line}`));
  }

  if (lines.length === 0) {
    return ["• 아직 강조할 만한 지표 변화 요약이 없습니다."];
  }

  return [...new Set(lines)];
}

function renderCombinedBriefingSection(
  marketBullets?: string[],
  macroBullets?: string[],
  fundFlowBullets?: string[]
): string[] {
  const lines = [
    ...prefixBullets("시장", marketBullets),
    ...prefixBullets("매크로", macroBullets),
    ...prefixBullets("자금", fundFlowBullets)
  ];

  if (lines.length === 0) {
    return ["• 시장, 매크로, 자금 브리핑 데이터가 아직 충분하지 않습니다."];
  }

  return lines;
}

function prefixBullets(label: string, bullets?: string[]): string[] {
  if (!bullets || bullets.length === 0) {
    return [];
  }

  return bullets.map((bullet) => `• [${label}] ${bullet}`);
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

function renderSnapshotLine(
  result: Extract<MarketDataFetchResult, { status: "ok" }>
): string {
  const changeText = formatChangeBadge(result.data.changePercent);
  const valueText = formatValueTransition(result.data.previousValue, result.data.value);

  return `• ${result.data.itemName}: ${valueText}${changeText ? `  ${changeText}` : ""}`;
}
