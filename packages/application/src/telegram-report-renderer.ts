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
    `오늘의 브리핑 (${input.runDate})`,
    `한 줄 요약: ${buildSummaryLine(successfulMarketItems.length, failedMarketItems.length, input.holdings.length)}`,
    "",
    "[거시 시장 스냅샷]",
    ...renderMarketSnapshot(successfulMarketItems),
    "",
    "[보유 종목]",
    ...renderHoldings(input.holdings)
  ];

  if (input.portfolioNewsBriefs && input.portfolioNewsBriefs.length > 0) {
    lines.push("", "[보유 종목 뉴스]", ...renderPortfolioNews(input.portfolioNewsBriefs));
  }

  if (input.quantScenarios && input.quantScenarios.length > 0) {
    lines.push("", "[전략 시나리오]", ...input.quantScenarios.map((scenario) => `- ${scenario}`));
  }

  if (input.riskCheckpoints && input.riskCheckpoints.length > 0) {
    lines.push(
      "",
      "[리스크 체크포인트]",
      ...input.riskCheckpoints.map((checkpoint) => `- ${checkpoint}`)
    );
  }

  if (failedMarketItems.length > 0) {
    lines.push("", "[누락 또는 지연 항목]", ...renderFailures(failedMarketItems));
  }

  if (
    !input.portfolioNewsBriefs?.length &&
    !input.quantScenarios?.length &&
    !input.riskCheckpoints?.length
  ) {
    lines.push(
      "",
      "[안내]",
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
    return ["- 수집된 시장 지표가 아직 없어."];
  }

  return results.map((result) => {
    const changeText =
      result.data.changePercent !== undefined
        ? ` (${formatSigned(result.data.changePercent)}%)`
        : "";

    return `- ${result.data.itemName}: ${result.data.value}${changeText}`;
  });
}

function renderHoldings(
  holdings: Array<{ companyName: string; exchange: string; symbol: string }>
): string[] {
  if (holdings.length === 0) {
    return ["- 등록된 보유 종목이 없어."];
  }

  return holdings.map(
    (holding) => `- ${holding.companyName} (${holding.symbol}, ${holding.exchange})`
  );
}

function renderFailures(
  results: Array<Extract<MarketDataFetchResult, { status: "error" }>>
): string[] {
  return results.map((result) => `- ${result.sourceKey}: ${result.message}`);
}

function renderPortfolioNews(briefs: HoldingNewsBrief[]): string[] {
  const lines: string[] = [];

  for (const brief of briefs) {
    if (brief.events.length === 0) {
      lines.push(
        `- ${brief.holding.companyName}: ${brief.errorMessage ?? "핵심 이벤트를 찾지 못했어."}`
      );
      continue;
    }

    for (const event of brief.events.slice(0, 2)) {
      lines.push(
        `- ${brief.holding.companyName}: ${event.headline} (${event.sentiment}, ${event.confidence})`
      );
      lines.push(`  ${event.summary}`);
    }
  }

  return lines;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
