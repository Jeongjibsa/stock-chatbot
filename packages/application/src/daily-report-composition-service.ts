import type { LlmClient } from "./llm-client.js";
import type { MarketDataFetchResult } from "./market-data.js";
import type { HoldingNewsBrief } from "./news.js";
import {
  buildDailyReportPromptContract,
  parseDailyReportStructuredOutput
} from "./report-prompt-contract.js";

export type DailyReportComposition = {
  articleSummaryBullets: string[];
  holdingTrendBullets: string[];
  keyIndicatorBullets: string[];
  llmResponseId?: string;
  oneLineSummary: string;
  riskBullets: string[];
  strategyBullets: string[];
};

export class DailyReportCompositionService {
  constructor(
    private readonly dependencies: {
      llmClient: LlmClient;
    }
  ) {}

  async compose(input: {
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
  }): Promise<DailyReportComposition> {
    const prompt = buildDailyReportPromptContract({
      holdings: input.holdings,
      marketResults: input.marketResults,
      newsBriefs: input.newsBriefs,
      quantScenarios: input.quantScenarios,
      riskCheckpoints: input.riskCheckpoints,
      runDate: input.runDate
    });
    const llmResponse = await this.dependencies.llmClient.generate({
      task: "market-report-composition",
      input: prompt.input,
      instructions: prompt.instructions,
      metadata: prompt.metadata
    });
    const parsed = parseDailyReportStructuredOutput(llmResponse.outputText);
    const result: DailyReportComposition = {
      oneLineSummary: parsed.oneLineSummary,
      keyIndicatorBullets: parsed.keyIndicatorBullets,
      holdingTrendBullets: parsed.holdingTrendBullets,
      articleSummaryBullets: parsed.articleSummaryBullets,
      strategyBullets: parsed.strategyBullets,
      riskBullets: parsed.riskBullets
    };

    if (llmResponse.id) {
      result.llmResponseId = llmResponse.id;
    }

    return result;
  }
}
