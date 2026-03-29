import type { LlmClient } from "./llm-client.js";
import type { BriefingSession } from "./briefing-session.js";
import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief, MacroTrendBrief } from "./news.js";
import type { QuantScorecard } from "./quant-scorecard.js";
import type { PersonalizedPortfolioRebalancingData } from "./rebalancing-contract.js";
import {
  buildDailyReportPromptContract,
  parseDailyReportStructuredOutput,
  type DailyReportPromptAudience
} from "./report-prompt-contract.js";

export type DailyReportComposition = {
  articleSummaryBullets: string[];
  eventBullets: string[];
  fundFlowBullets: string[];
  headlineEvents: Array<{ headline: string; sourceLabel: string; summary: string }>;
  holdingTrendBullets: string[];
  macroBullets: string[];
  marketBullets: string[];
  llmResponseId?: string;
  newsReferences: Array<{ sourceLabel: string; title: string; url: string }>;
  oneLineSummary: string;
  riskBullets: string[];
  strategyBullets: string[];
  trendNewsBullets: string[];
};

export class DailyReportCompositionService {
  constructor(
    private readonly dependencies: {
      llmClient: LlmClient;
    }
  ) {}

  async compose(input: {
    audience?: DailyReportPromptAudience;
    briefingSession?: BriefingSession;
    holdings: Array<{
      companyName: string;
      exchange: string;
      symbol: string;
    }>;
    marketResults: MarketDataFetchResult[];
    macroTrendBriefs?: MacroTrendBrief[];
    newsBriefs: HoldingNewsBrief[];
    quantScorecards: QuantScorecard[];
    quantScenarios: string[];
    riskCheckpoints: string[];
    runDate: string;
    timeoutMs?: number;
    sessionComparison?: {
      priorPublicSignals?: string[];
      priorPublicSummary?: string | null;
      priorStrategyActions?: string[];
      priorStrategyStance?: string | null;
    };
    portfolioRebalancing?: PersonalizedPortfolioRebalancingData;
    cachedContent?: string;
  }): Promise<DailyReportComposition> {
    const promptInput: Parameters<typeof buildDailyReportPromptContract>[0] = {
      ...(input.audience ? { audience: input.audience } : {}),
      ...(input.briefingSession ? { briefingSession: input.briefingSession } : {}),
      holdings: input.holdings,
      marketResults: input.marketResults,
      macroTrendBriefs: input.macroTrendBriefs ?? [],
      newsBriefs: input.newsBriefs,
      quantScorecards: input.quantScorecards,
      quantScenarios: input.quantScenarios,
      riskCheckpoints: input.riskCheckpoints,
      runDate: input.runDate,
      ...(input.sessionComparison
        ? { sessionComparison: input.sessionComparison }
        : {})
    };

    if (input.portfolioRebalancing) {
      promptInput.portfolioRebalancing = input.portfolioRebalancing;
    }

    const prompt = buildDailyReportPromptContract(promptInput);
    const llmResponse = await this.dependencies.llmClient.generate({
      task: "market-report-composition",
      input: prompt.input,
      instructions: prompt.instructions,
      metadata: prompt.metadata,
      schema: prompt.schema,
      ...(input.cachedContent ? { cachedContent: input.cachedContent } : {}),
      ...(input.timeoutMs ? { timeoutMs: input.timeoutMs } : {})
    });
    const parsed = parseDailyReportStructuredOutput(llmResponse.outputText);
    const result: DailyReportComposition = {
      oneLineSummary: parsed.oneLineSummary,
      marketBullets: parsed.marketBullets,
      macroBullets: parsed.macroBullets,
      fundFlowBullets: parsed.fundFlowBullets,
      eventBullets: parsed.eventBullets,
      holdingTrendBullets: parsed.holdingTrendBullets,
      articleSummaryBullets: parsed.articleSummaryBullets,
      headlineEvents: parsed.headlineEvents,
      strategyBullets: parsed.strategyBullets,
      riskBullets: parsed.riskBullets,
      trendNewsBullets: parsed.trendNewsBullets,
      newsReferences: parsed.newsReferences
    };

    if (llmResponse.id) {
      result.llmResponseId = llmResponse.id;
    }

    return result;
  }
}
