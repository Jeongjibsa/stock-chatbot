import type { MarketDataAdapter, MarketDataFetchResult } from "./market-data.js";
import type { DailyReportComposition } from "./daily-report-composition-service.js";
import type { HoldingNewsBrief } from "./news.js";
import { renderTelegramDailyReport } from "./telegram-report-renderer.js";

type PortfolioHoldingRepositoryPort = {
  listByUserId(userId: string): Promise<
    Array<{
      companyName: string;
      exchange: string;
      symbol: string;
    }>
  >;
};

type UserMarketWatchRepositoryPort = {
  listEffectiveByUserId(userId: string): Promise<
    Array<{
      itemCode: string;
      itemName: string;
      sourceKey: string;
    }>
  >;
};

type ReportRunRepositoryPort = {
  completeRun(input: {
    errorMessage?: string;
    id: string;
    reportText?: string;
    status: "completed" | "failed" | "partial_success";
  }): Promise<{
    id: string;
    errorMessage?: string | null;
    reportText?: string | null;
    status: string;
  }>;
  startRun(input: {
    promptVersion?: string;
    runDate: string;
    scheduleType: string;
    skillVersion?: string;
    userId: string;
  }): Promise<{
    created: boolean;
    run: {
      id: string;
      reportText?: string | null;
      status: string;
    };
  }>;
};

type PortfolioNewsBriefServicePort = {
  generateBriefsForHoldings(
    holdings: Array<{
      companyName: string;
      exchange: string;
      symbol: string;
    }>
  ): Promise<HoldingNewsBrief[]>;
};

type ReportCompositionServicePort = {
  compose(input: {
    holdings: Array<{
      companyName: string;
      exchange: string;
      symbol: string;
    }>;
    marketResults: MarketDataFetchResult[];
    newsBriefs: HoldingNewsBrief[];
    quantScenarios: string[];
    riskCheckpoints: string[];
    runDate: string;
  }): Promise<DailyReportComposition>;
};

export type DailyReportOrchestratorResult = {
  marketResults: MarketDataFetchResult[];
  portfolioNewsBriefs: HoldingNewsBrief[];
  reportRun: {
    id: string;
    errorMessage?: string | null;
    reportText?: string | null;
    status: string;
  };
  reportText: string;
  status: "completed" | "failed" | "partial_success" | "skipped_duplicate";
};

export class DailyReportOrchestrator {
  constructor(
    private readonly dependencies: {
      marketDataAdapter: MarketDataAdapter;
      portfolioHoldingRepository: PortfolioHoldingRepositoryPort;
      portfolioNewsBriefService?: PortfolioNewsBriefServicePort;
      reportCompositionService?: ReportCompositionServicePort;
      reportRunRepository: ReportRunRepositoryPort;
      userMarketWatchRepository: UserMarketWatchRepositoryPort;
    }
  ) {}

  async runForUser(input: {
    promptVersion?: string;
    runDate: string;
    scheduleType: string;
    skillVersion?: string;
    user: {
      displayName: string;
      id: string;
    };
  }): Promise<DailyReportOrchestratorResult> {
    const startRunInput: {
      promptVersion?: string;
      runDate: string;
      scheduleType: string;
      skillVersion?: string;
      userId: string;
    } = {
      userId: input.user.id,
      runDate: input.runDate,
      scheduleType: input.scheduleType
    };

    if (input.promptVersion) {
      startRunInput.promptVersion = input.promptVersion;
    }

    if (input.skillVersion) {
      startRunInput.skillVersion = input.skillVersion;
    }

    const started = await this.dependencies.reportRunRepository.startRun(startRunInput);

    if (!started.created) {
      return {
        status: "skipped_duplicate",
        reportRun: started.run,
        reportText: started.run.reportText ?? "",
        marketResults: [],
        portfolioNewsBriefs: []
      };
    }

    const [holdings, marketWatchItems] = await Promise.all([
      this.dependencies.portfolioHoldingRepository.listByUserId(input.user.id),
      this.dependencies.userMarketWatchRepository.listEffectiveByUserId(input.user.id)
    ]);
    const marketResults = await this.dependencies.marketDataAdapter.fetchMany(
      marketWatchItems.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        sourceKey: item.sourceKey
      }))
    );
    const portfolioNewsBriefs = this.dependencies.portfolioNewsBriefService
      ? await this.dependencies.portfolioNewsBriefService.generateBriefsForHoldings(
          holdings.map((holding) => ({
            companyName: holding.companyName,
            symbol: holding.symbol,
            exchange: holding.exchange
          }))
        )
      : [];
    let composition: DailyReportComposition | undefined;
    let compositionError: string | undefined;

    if (this.dependencies.reportCompositionService) {
      try {
        composition = await this.dependencies.reportCompositionService.compose({
          holdings: holdings.map((holding) => ({
            companyName: holding.companyName,
            symbol: holding.symbol,
            exchange: holding.exchange
          })),
          marketResults,
          newsBriefs: portfolioNewsBriefs,
          quantScenarios: [],
          riskCheckpoints: [],
          runDate: input.runDate
        });
      } catch (error) {
        compositionError =
          error instanceof Error
            ? error.message
            : "daily report composition failed";
      }
    }

    const status = resolveRunStatus(marketResults, portfolioNewsBriefs, compositionError);
    const renderInput: Parameters<typeof renderTelegramDailyReport>[0] = {
      displayName: input.user.displayName,
      runDate: input.runDate,
      holdings: holdings.map((holding) => ({
        companyName: holding.companyName,
        symbol: holding.symbol,
        exchange: holding.exchange
      })),
      marketResults,
      portfolioNewsBriefs
    };

    if (composition?.oneLineSummary) {
      renderInput.summaryLine = composition.oneLineSummary;
    }

    if (composition?.holdingTrendBullets) {
      renderInput.holdingTrendBullets = composition.holdingTrendBullets;
    }

    if (composition?.marketBullets) {
      renderInput.marketBullets = composition.marketBullets;
    }

    if (composition?.macroBullets) {
      renderInput.macroBullets = composition.macroBullets;
    }

    if (composition?.fundFlowBullets) {
      renderInput.fundFlowBullets = composition.fundFlowBullets;
    }

    if (composition?.eventBullets) {
      renderInput.eventBullets = composition.eventBullets;
    }

    if (composition?.macroBullets) {
      renderInput.keyIndicatorSummaries = composition.macroBullets;
    }

    if (composition?.articleSummaryBullets) {
      renderInput.articleSummaryBullets = composition.articleSummaryBullets;
    }

    if (composition?.strategyBullets) {
      renderInput.quantScenarios = composition.strategyBullets;
    }

    if (composition?.riskBullets) {
      renderInput.riskCheckpoints = composition.riskBullets;
    }

    const reportText = renderTelegramDailyReport(renderInput);
    const errorMessage = buildErrorMessage(
      marketResults,
      portfolioNewsBriefs,
      compositionError
    );
    const completeRunInput: {
      errorMessage?: string;
      id: string;
      reportText?: string;
      status: "completed" | "failed" | "partial_success";
    } = {
      id: started.run.id,
      status,
      reportText
    };

    if (errorMessage) {
      completeRunInput.errorMessage = errorMessage;
    }

    const completedRun = await this.dependencies.reportRunRepository.completeRun(
      completeRunInput
    );

    return {
      status,
      reportRun: completedRun,
      reportText,
      marketResults,
      portfolioNewsBriefs
    };
  }
}

function resolveRunStatus(
  marketResults: MarketDataFetchResult[],
  portfolioNewsBriefs: HoldingNewsBrief[],
  compositionError?: string
): "completed" | "failed" | "partial_success" {
  const successCount = marketResults.filter((result) => result.status === "ok").length;
  const errorCount = marketResults.length - successCount;
  const newsErrorCount = portfolioNewsBriefs.filter(
    (brief) => brief.status !== "ok"
  ).length;

  if (successCount === 0 && errorCount > 0 && newsErrorCount === portfolioNewsBriefs.length) {
    return "failed";
  }

  if (errorCount > 0 || newsErrorCount > 0 || compositionError) {
    return "partial_success";
  }

  return "completed";
}

function buildErrorMessage(
  marketResults: MarketDataFetchResult[],
  portfolioNewsBriefs: HoldingNewsBrief[],
  compositionError?: string
): string | undefined {
  const errors = marketResults.filter(
    (result): result is Extract<MarketDataFetchResult, { status: "error" }> =>
      result.status === "error"
  );
  const newsErrors = portfolioNewsBriefs
    .filter((brief) => brief.status !== "ok")
    .map((brief) => `${brief.holding.symbol}: ${brief.errorMessage ?? "news_unavailable"}`);

  if (errors.length === 0 && newsErrors.length === 0 && !compositionError) {
    return undefined;
  }

  return [
    ...errors.map((error) => `${error.sourceKey}: ${error.message}`),
    ...newsErrors,
    ...(compositionError ? [`report_composition: ${compositionError}`] : [])
  ].join("; ");
}
