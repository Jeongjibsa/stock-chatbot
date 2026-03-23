import type { BriefingSession } from "./briefing-session.js";
import type { MarketDataAdapter, MarketDataFetchResult } from "./market-data.js";
import type { DailyReportComposition } from "./daily-report-composition-service.js";
import {
  buildPersonalRebalancingSnapshot,
  DEFAULT_PERSONAL_REBALANCING_SNAPSHOT_VERSION
} from "./personal-rebalancing-snapshot.js";
import { resolveEffectiveReportDate } from "./effective-report-date.js";
import type {
  HoldingPriceSnapshot,
  HoldingPriceSnapshotProvider
} from "./holding-price-snapshot.js";
import type { HoldingNewsBrief } from "./news.js";
import type { QuantScorecard } from "./quant-scorecard.js";
import type { PersonalizedPortfolioRebalancingData } from "./rebalancing-contract.js";
import { buildRuleBasedBriefing } from "./rule-based-briefing.js";
import {
  buildPublicBriefingUrl,
  buildPublicReportDetailUrl
} from "./public-daily-briefing.js";
import {
  buildQuantScorecards,
  toQuantStrategyBullets
} from "./quant-scorecard.js";
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

type DefaultMarketItem = {
  itemCode: string;
  itemName: string;
  sourceKey: string;
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
    audience?: "telegram_personalized" | "public_web";
    briefingSession?: BriefingSession;
    holdings: Array<{
      companyName: string;
      exchange: string;
      symbol: string;
    }>;
    marketResults: MarketDataFetchResult[];
    newsBriefs: HoldingNewsBrief[];
    quantScorecards: QuantScorecard[];
    quantScenarios: string[];
    riskCheckpoints: string[];
    runDate: string;
    sessionComparison?: {
      priorPublicSignals?: string[];
      priorPublicSummary?: string | null;
      priorStrategyActions?: string[];
      priorStrategyStance?: string | null;
    };
  }): Promise<DailyReportComposition>;
};

type StrategySnapshotRepositoryPort = {
  insertMany(
    input: Array<{
      action: string;
      actionSummary: string;
      companyName: string;
      eventScore: string;
      exchange?: string;
      flowScore: string;
      macroScore: string;
      reportRunId: string;
      runDate: string;
      scheduleType: string;
      symbol?: string;
      totalScore: string;
      trendScore: string;
      userId: string;
    }>
  ): Promise<unknown>;
  listByUserAndRunDateAndScheduleTypes(input: {
    runDate: string;
    scheduleTypes: string[];
    userId: string;
  }): Promise<
    Array<{
      action: string;
      actionSummary: string;
      companyName: string;
      runDate: string | Date;
      scheduleType: string;
    }>
  >;
};

type PersonalRebalancingSnapshotRepositoryPort = {
  deleteOlderThan(cutoffDate: string): Promise<number>;
  findByUserAndEffectiveDate(input: {
    effectiveReportDate: string;
    snapshotVersion: string;
    userId: string;
  }): Promise<{
    payload: Record<string, unknown>;
  } | null>;
  upsert(input: {
    effectiveReportDate: string;
    krSessionDate?: string | null;
    payload: Record<string, unknown>;
    requestedSeoulDate: string;
    snapshotVersion: string;
    usSessionDate?: string | null;
    userId: string;
  }): Promise<unknown>;
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
      defaultMarketItems?: DefaultMarketItem[];
      holdingPriceSnapshotProvider?: HoldingPriceSnapshotProvider;
      marketDataAdapter: MarketDataAdapter;
      personalRebalancingSnapshotRepository?: PersonalRebalancingSnapshotRepositoryPort;
      portfolioHoldingRepository: PortfolioHoldingRepositoryPort;
      portfolioNewsBriefService?: PortfolioNewsBriefServicePort;
      publicBriefingBaseUrl?: string;
      publicReportRepository?: {
        findLatestByReportDate(reportDate: string): Promise<{
          id: string;
        } | null>;
        findLatestByReportDateAndSession(
          reportDate: string,
          briefingSession: BriefingSession
        ): Promise<{
          id: string;
          signals?: string[] | null;
          summary?: string | null;
        } | null>;
      };
      reportCompositionService?: ReportCompositionServicePort;
      reportRunRepository: ReportRunRepositoryPort;
      strategySnapshotRepository?: StrategySnapshotRepositoryPort;
      userMarketWatchRepository?: UserMarketWatchRepositoryPort;
    }
  ) {}

  async runForUser(input: {
    briefingSession?: BriefingSession;
    portfolioRebalancing?: PersonalizedPortfolioRebalancingData;
    promptVersion?: string;
    runDate: string;
    scheduleType: string;
    skillVersion?: string;
    user: {
      displayName: string;
      id: string;
      includePublicBriefingLink?: boolean;
      reportDetailLevel?: "compact" | "standard";
    };
  }): Promise<DailyReportOrchestratorResult> {
    const briefingSession = input.briefingSession ?? "pre_market";
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

    let marketResults: MarketDataFetchResult[] = [];
    let portfolioNewsBriefs: HoldingNewsBrief[] = [];

    try {
      const defaultMarketItems = this.dependencies.defaultMarketItems;
      const [holdings, marketWatchItems] = await Promise.all([
        this.dependencies.portfolioHoldingRepository.listByUserId(input.user.id),
        defaultMarketItems
          ? Promise.resolve(defaultMarketItems)
          : this.dependencies.userMarketWatchRepository?.listEffectiveByUserId(input.user.id) ??
            Promise.resolve([])
      ]);
      marketResults = await this.dependencies.marketDataAdapter.fetchMany(
        marketWatchItems.map((item) => ({
          asOfDate: input.runDate,
          itemCode: item.itemCode,
          itemName: item.itemName,
          sourceKey: item.sourceKey
        }))
      );
      portfolioNewsBriefs = this.dependencies.portfolioNewsBriefService
        ? await this.dependencies.portfolioNewsBriefService.generateBriefsForHoldings(
            holdings.map((holding) => ({
              companyName: holding.companyName,
              symbol: holding.symbol,
              exchange: holding.exchange
            }))
          )
        : [];
      const holdingInputs = holdings.map((holding) => ({
        companyName: holding.companyName,
        symbol: holding.symbol,
        exchange: holding.exchange
      }));
      const holdingSnapshots = await buildHoldingSnapshotMap({
        holdings: holdingInputs,
        ...(this.dependencies.holdingPriceSnapshotProvider
          ? { provider: this.dependencies.holdingPriceSnapshotProvider }
          : {}),
        runDate: input.runDate
      });
      const quantScorecards = buildQuantScorecards({
        holdings: holdingInputs,
        marketResults,
        portfolioNewsBriefs
      });
      const quantScenarios = toQuantStrategyBullets(quantScorecards);
      const sessionComparison = await this.resolveSessionComparison({
        briefingSession,
        runDate: input.runDate,
        userId: input.user.id
      });
      const sessionDateResolution = resolveEffectiveReportDate({
        marketResults,
        requestedSeoulDate: input.runDate
      });
      const portfolioRebalancing = await this.resolvePortfolioRebalancing({
        holdings: holdings.map((holding) => {
          const snapshot = holdingSnapshots.get(holding.symbol);

          return {
            companyName: holding.companyName,
            symbol: holding.symbol,
            exchange: holding.exchange,
            ...(snapshot?.currentPrice !== undefined
              ? { currentPrice: snapshot.currentPrice }
              : {}),
            ...(snapshot?.previousClose !== undefined
              ? { previousClose: snapshot.previousClose }
              : {}),
            ...(snapshot?.changePercent !== undefined
              ? { changePercent: snapshot.changePercent }
              : {})
          };
        }),
        marketResults,
        portfolioNewsBriefs,
        quantScorecards,
        userId: input.user.id,
        ...(input.portfolioRebalancing
          ? { provided: input.portfolioRebalancing }
          : {}),
        effectiveReportDate: input.runDate,
        requestedSeoulDate: input.runDate,
        ...(sessionDateResolution.krSessionDate
          ? { krSessionDate: sessionDateResolution.krSessionDate }
          : {}),
        ...(sessionDateResolution.usSessionDate
          ? { usSessionDate: sessionDateResolution.usSessionDate }
          : {})
      });
      let strategySnapshotError: string | undefined;

      if (this.dependencies.strategySnapshotRepository) {
        try {
          const holdingMap = new Map(
            holdings.map((holding) => [holding.symbol, holding])
          );

          await this.dependencies.strategySnapshotRepository.insertMany(
            quantScorecards.map((scorecard) => {
              const matchingHolding = scorecard.symbol
                ? holdingMap.get(scorecard.symbol)
                : undefined;
              const snapshotInput: {
                action: string;
                actionSummary: string;
                companyName: string;
                eventScore: string;
                exchange?: string;
                flowScore: string;
                macroScore: string;
                reportRunId: string;
                runDate: string;
                scheduleType: string;
                symbol?: string;
                totalScore: string;
                trendScore: string;
                userId: string;
              } = {
                reportRunId: started.run.id,
                userId: input.user.id,
                runDate: input.runDate,
                scheduleType: input.scheduleType,
                companyName: scorecard.companyName,
                action: scorecard.action,
                actionSummary: scorecard.actionSummary,
                macroScore: scorecard.macroScore.toFixed(2),
                trendScore: scorecard.trendScore.toFixed(2),
                eventScore: scorecard.eventScore.toFixed(2),
                flowScore: scorecard.flowScore.toFixed(2),
                totalScore: scorecard.totalScore.toFixed(2)
              };

              if (matchingHolding?.exchange) {
                snapshotInput.exchange = matchingHolding.exchange;
              }

              if (scorecard.symbol) {
                snapshotInput.symbol = scorecard.symbol;
              }

              return snapshotInput;
            })
          );
        } catch (error) {
          strategySnapshotError =
            error instanceof Error
              ? error.message
              : "strategy snapshot persistence failed";
        }
      }

      let composition: DailyReportComposition | undefined;
      let compositionError: string | undefined;
      const fallbackBriefing = buildRuleBasedBriefing(marketResults);

      if (this.dependencies.reportCompositionService) {
        try {
          composition = await this.dependencies.reportCompositionService.compose({
            audience: "telegram_personalized",
            briefingSession,
            holdings: holdings.map((holding) => ({
              companyName: holding.companyName,
              symbol: holding.symbol,
              exchange: holding.exchange
            })),
            marketResults,
            newsBriefs: portfolioNewsBriefs,
            ...(portfolioRebalancing ? { portfolioRebalancing } : {}),
            quantScorecards,
            quantScenarios,
            riskCheckpoints: [],
            runDate: input.runDate,
            ...(sessionComparison ? { sessionComparison } : {})
          });
        } catch (error) {
          compositionError =
            error instanceof Error
              ? error.message
              : "daily report composition failed";
        }
      }

      const status = resolveRunStatus(
        marketResults,
        portfolioNewsBriefs,
        compositionError,
        strategySnapshotError
      );
      const renderInput: Parameters<typeof renderTelegramDailyReport>[0] = {
        briefingSession,
        displayName: input.user.displayName,
        runDate: input.runDate,
        holdings: holdings.map((holding) => {
          const snapshot = holdingSnapshots.get(holding.symbol);

          return {
            companyName: holding.companyName,
            symbol: holding.symbol,
            exchange: holding.exchange,
            ...(snapshot?.currentPrice !== undefined
              ? { currentPrice: snapshot.currentPrice }
              : {}),
            ...(snapshot?.previousClose !== undefined
              ? { previousClose: snapshot.previousClose }
              : {}),
            ...(snapshot?.changePercent !== undefined
              ? { changePercent: snapshot.changePercent }
              : {})
          };
        }),
        marketResults,
        portfolioNewsBriefs,
        ...(sessionComparison ? { sessionComparison } : {}),
        ...(portfolioRebalancing ? { portfolioRebalancing } : {}),
        quantScorecards
      };

      if (input.user.reportDetailLevel) {
        renderInput.reportDetailLevel = input.user.reportDetailLevel;
      }

      if (composition?.oneLineSummary) {
        renderInput.summaryLine = composition.oneLineSummary;
      }

      if (composition?.holdingTrendBullets) {
        renderInput.holdingTrendBullets = composition.holdingTrendBullets;
      }

      if (composition?.marketBullets?.length) {
        renderInput.marketBullets = composition.marketBullets;
      } else if (fallbackBriefing.marketBullets.length > 0) {
        renderInput.marketBullets = fallbackBriefing.marketBullets;
      }

      if (composition?.macroBullets?.length) {
        renderInput.macroBullets = composition.macroBullets;
      } else if (fallbackBriefing.macroBullets.length > 0) {
        renderInput.macroBullets = fallbackBriefing.macroBullets;
      }

      if (composition?.fundFlowBullets?.length) {
        renderInput.fundFlowBullets = composition.fundFlowBullets;
      } else if (fallbackBriefing.fundFlowBullets.length > 0) {
        renderInput.fundFlowBullets = fallbackBriefing.fundFlowBullets;
      }

      if (composition?.eventBullets?.length) {
        renderInput.eventBullets = composition.eventBullets;
      } else if (fallbackBriefing.eventBullets.length > 0) {
        renderInput.eventBullets = fallbackBriefing.eventBullets;
      }

      if (composition?.macroBullets?.length) {
        renderInput.keyIndicatorSummaries = composition.macroBullets;
      } else if (fallbackBriefing.keyIndicatorBullets.length > 0) {
        renderInput.keyIndicatorSummaries = fallbackBriefing.keyIndicatorBullets;
      }

      if (composition?.articleSummaryBullets) {
        renderInput.articleSummaryBullets = composition.articleSummaryBullets;
      }

      if (composition?.strategyBullets) {
        renderInput.quantScenarios = composition.strategyBullets;
      } else {
        renderInput.quantScenarios = quantScenarios;
      }

      if (composition?.riskBullets?.length) {
        renderInput.riskCheckpoints = composition.riskBullets;
      } else if (fallbackBriefing.riskBullets.length > 0) {
        renderInput.riskCheckpoints = fallbackBriefing.riskBullets;
      }

      if (!renderInput.summaryLine && fallbackBriefing.summaryLine) {
        renderInput.summaryLine = fallbackBriefing.summaryLine;
      }

      if (
        this.dependencies.publicBriefingBaseUrl &&
        input.user.includePublicBriefingLink !== false
      ) {
        const publicReportRepository = this.dependencies.publicReportRepository;
        const latestPublicReport =
          typeof publicReportRepository?.findLatestByReportDateAndSession === "function"
            ? await publicReportRepository.findLatestByReportDateAndSession(
                input.runDate,
                briefingSession
              )
            : briefingSession === "pre_market"
              ? await publicReportRepository?.findLatestByReportDate(input.runDate)
              : null;

        renderInput.publicBriefingUrl = latestPublicReport
          ? buildPublicReportDetailUrl(
              this.dependencies.publicBriefingBaseUrl,
              latestPublicReport.id
            )
          : buildPublicBriefingUrl(
              this.dependencies.publicBriefingBaseUrl,
              input.runDate,
              briefingSession
            );
      }

      const reportText = renderTelegramDailyReport(renderInput);
      const errorMessage = buildErrorMessage(
        marketResults,
        portfolioNewsBriefs,
        compositionError,
        strategySnapshotError
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "daily report orchestration failed";

      let completedRun: {
        id: string;
        errorMessage?: string | null;
        reportText?: string | null;
        status: string;
      } = {
        ...started.run,
        status: "failed",
        errorMessage,
        reportText: null
      };

      try {
        completedRun = await this.dependencies.reportRunRepository.completeRun({
          id: started.run.id,
          status: "failed",
          errorMessage
        });
      } catch {
        // Best-effort cleanup. The caller still gets a failed status instead of wedging.
      }

      return {
        status: "failed",
        reportRun: completedRun,
        reportText: "",
        marketResults,
        portfolioNewsBriefs
      };
    }
  }

  private async resolveSessionComparison(input: {
    briefingSession: BriefingSession;
    runDate: string;
    userId: string;
  }): Promise<
    | {
        priorPublicSignals?: string[];
        priorPublicSummary?: string | null;
        priorStrategyActions?: string[];
        priorStrategyStance?: string | null;
      }
    | undefined
  > {
    if (input.briefingSession !== "post_market") {
      return undefined;
    }

    const priorPublicReport =
      await this.dependencies.publicReportRepository?.findLatestByReportDateAndSession(
        input.runDate,
        "pre_market"
      );
    const priorStrategySnapshots =
      await this.dependencies.strategySnapshotRepository?.listByUserAndRunDateAndScheduleTypes({
        userId: input.userId,
        runDate: input.runDate,
        scheduleTypes: ["daily-pre-market", "manual-pre-market"]
      });

    if (!priorPublicReport && (!priorStrategySnapshots || priorStrategySnapshots.length === 0)) {
      return undefined;
    }

    const strategyActions =
      priorStrategySnapshots?.map(
        (snapshot) => `${snapshot.companyName}: ${snapshot.actionSummary}`
      ) ?? [];

    return {
      priorPublicSummary: priorPublicReport?.summary ?? null,
      priorPublicSignals: priorPublicReport?.signals ?? [],
      priorStrategyActions: strategyActions,
      priorStrategyStance:
        strategyActions.length > 0 ? strategyActions.slice(0, 3).join(" | ") : null
    };
  }

  private async resolvePortfolioRebalancing(input: {
    effectiveReportDate: string;
    holdings: Array<{
      changePercent?: number;
      companyName: string;
      currentPrice?: number;
      exchange: string;
      previousClose?: number;
      symbol: string;
    }>;
    krSessionDate?: string;
    marketResults: MarketDataFetchResult[];
    portfolioNewsBriefs: HoldingNewsBrief[];
    provided?: PersonalizedPortfolioRebalancingData;
    quantScorecards: QuantScorecard[];
    requestedSeoulDate: string;
    usSessionDate?: string;
    userId: string;
  }): Promise<PersonalizedPortfolioRebalancingData | undefined> {
    const repository = this.dependencies.personalRebalancingSnapshotRepository;
    const snapshotVersion = DEFAULT_PERSONAL_REBALANCING_SNAPSHOT_VERSION;

    if (input.provided) {
      await this.persistPersonalSnapshot({
        effectiveReportDate: input.effectiveReportDate,
        payload: input.provided,
        requestedSeoulDate: input.requestedSeoulDate,
        snapshotVersion,
        userId: input.userId,
        ...(input.krSessionDate ? { krSessionDate: input.krSessionDate } : {}),
        ...(input.usSessionDate ? { usSessionDate: input.usSessionDate } : {})
      });
      return input.provided;
    }

    if (repository) {
      const cached = await repository.findByUserAndEffectiveDate({
        userId: input.userId,
        effectiveReportDate: input.effectiveReportDate,
        snapshotVersion
      });

      if (cached?.payload) {
        const cachedPayload = cached.payload as PersonalizedPortfolioRebalancingData;

        if (!isSnapshotStale(cachedPayload, input.holdings)) {
          return cachedPayload;
        }
      }
    }

    const built = buildPersonalRebalancingSnapshot({
      holdings: input.holdings,
      marketResults: input.marketResults,
      portfolioNewsBriefs: input.portfolioNewsBriefs,
      quantScorecards: input.quantScorecards
    });

    await this.persistPersonalSnapshot({
      effectiveReportDate: input.effectiveReportDate,
      payload: built,
      requestedSeoulDate: input.requestedSeoulDate,
      snapshotVersion,
      userId: input.userId,
      ...(input.krSessionDate ? { krSessionDate: input.krSessionDate } : {}),
      ...(input.usSessionDate ? { usSessionDate: input.usSessionDate } : {})
    });

    return built;
  }

  private async persistPersonalSnapshot(input: {
    effectiveReportDate: string;
    krSessionDate?: string;
    payload: PersonalizedPortfolioRebalancingData;
    requestedSeoulDate: string;
    snapshotVersion: string;
    usSessionDate?: string;
    userId: string;
  }): Promise<void> {
    const repository = this.dependencies.personalRebalancingSnapshotRepository;

    if (!repository) {
      return;
    }

    await repository.upsert({
      userId: input.userId,
      requestedSeoulDate: input.requestedSeoulDate,
      effectiveReportDate: input.effectiveReportDate,
      ...(input.krSessionDate ? { krSessionDate: input.krSessionDate } : {}),
      ...(input.usSessionDate ? { usSessionDate: input.usSessionDate } : {}),
      snapshotVersion: input.snapshotVersion,
      payload: input.payload as Record<string, unknown>
    });

    await repository.deleteOlderThan(subtractDays(input.effectiveReportDate, 90));
  }
}

function resolveRunStatus(
  marketResults: MarketDataFetchResult[],
  portfolioNewsBriefs: HoldingNewsBrief[],
  compositionError?: string,
  strategySnapshotError?: string
): "completed" | "failed" | "partial_success" {
  const successCount = marketResults.filter((result) => result.status === "ok").length;
  const errorCount = marketResults.length - successCount;
  const newsErrorCount = portfolioNewsBriefs.filter(
    (brief) => brief.status !== "ok"
  ).length;

  if (successCount === 0 && errorCount > 0 && newsErrorCount === portfolioNewsBriefs.length) {
    return "failed";
  }

  if (errorCount > 0 || newsErrorCount > 0 || compositionError || strategySnapshotError) {
    return "partial_success";
  }

  return "completed";
}

function buildErrorMessage(
  marketResults: MarketDataFetchResult[],
  portfolioNewsBriefs: HoldingNewsBrief[],
  compositionError?: string,
  strategySnapshotError?: string
): string | undefined {
  const errors = marketResults.filter(
    (result): result is Extract<MarketDataFetchResult, { status: "error" }> =>
      result.status === "error"
  );
  const newsErrors = portfolioNewsBriefs
    .filter((brief) => brief.status !== "ok")
    .map((brief) => `${brief.holding.symbol}: ${brief.errorMessage ?? "news_unavailable"}`);

  if (
    errors.length === 0 &&
    newsErrors.length === 0 &&
    !compositionError &&
    !strategySnapshotError
  ) {
    return undefined;
  }

  return [
    ...errors.map((error) => `${error.sourceKey}: ${error.message}`),
    ...newsErrors,
    ...(compositionError ? [`report_composition: ${compositionError}`] : []),
    ...(strategySnapshotError ? [`strategy_snapshot: ${strategySnapshotError}`] : [])
  ].join("; ");
}

function subtractDays(dateOnly: string, days: number): string {
  const value = new Date(`${dateOnly}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function isSnapshotStale(
  payload: PersonalizedPortfolioRebalancingData,
  holdings: Array<{ companyName: string; symbol: string }>
): boolean {
  const cachedHoldings = payload.holdings ?? [];

  if (cachedHoldings.length !== holdings.length) {
    return true;
  }

  const cachedNames = new Set(cachedHoldings.map((holding) => holding.name));

  return holdings.some((holding) => !cachedNames.has(holding.companyName));
}

async function buildHoldingSnapshotMap(input: {
  holdings: Array<{
    companyName: string;
    exchange: string;
    symbol: string;
  }>;
  provider?: HoldingPriceSnapshotProvider;
  runDate: string;
}): Promise<Map<string, HoldingPriceSnapshot>> {
  const snapshotMap = new Map<string, HoldingPriceSnapshot>();

  if (!input.provider) {
    return snapshotMap;
  }

  await Promise.all(
    input.holdings.map(async (holding) => {
      try {
        const snapshot = await input.provider?.getHoldingPriceSnapshot({
          exchange: holding.exchange,
          runDate: input.runDate,
          symbol: holding.symbol
        });

        if (snapshot) {
          snapshotMap.set(holding.symbol, snapshot);
        }
      } catch {
        // Holding snapshots are best-effort for Telegram readability.
      }
    })
  );

  return snapshotMap;
}
