import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPublicDailyBriefing,
  resolveEffectiveReportDate,
  buildRuleBasedBriefing,
  buildQuantScorecards,
  CompositeMarketDataAdapter,
  DailyReportCompositionService,
  FredMarketDataAdapter,
  GOOGLE_PROVIDER_PROFILE,
  createLlmClient,
  OPENAI_PROVIDER_PROFILE,
  renderPublicDailyBriefingMarkdown,
  toQuantStrategyBullets,
  YahooFinanceScrapingMarketDataAdapter,
  type DailyReportComposition,
  type MarketDataAdapter
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  DEFAULT_MARKET_WATCH_CATALOG,
  PublicReportRepository
} from "@stock-chatbot/database";

import {
  readFredApiKey,
  readGeminiApiKey,
  readLlmProvider,
  readOpenAiApiKey,
  readRunDate
} from "./process-daily-report.js";

type Environment = Record<string, string | undefined>;

type PublicBriefingBuilderDependencies = {
  marketDataAdapter: MarketDataAdapter;
  reportCompositionService?: Pick<DailyReportCompositionService, "compose">;
  runDate: string;
};

export function readPublicBriefingOutputPath(
  env: Environment = process.env
): string {
  return (
    env.PUBLIC_BRIEFING_OUTPUT_PATH?.trim() ||
    "artifacts/public-briefing/public-daily-briefing.json"
  );
}

export async function buildPublicBriefing(
  dependencies: PublicBriefingBuilderDependencies
) {
  const marketResults = await dependencies.marketDataAdapter.fetchMany(
    DEFAULT_MARKET_WATCH_CATALOG
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => ({
        asOfDate: dependencies.runDate,
        itemCode: item.itemCode,
        itemName: item.itemName,
        sourceKey: item.sourceKey
      }))
  );
  const dateResolution = resolveEffectiveReportDate({
    marketResults,
    requestedSeoulDate: dependencies.runDate
  });

  const quantScorecards = buildQuantScorecards({
    holdings: [],
    marketResults,
    portfolioNewsBriefs: []
  });
  const quantScenarios = toQuantStrategyBullets(quantScorecards);
  let composition: DailyReportComposition | undefined;

  if (dependencies.reportCompositionService) {
    try {
      composition = await dependencies.reportCompositionService.compose({
        audience: "public_web",
        holdings: [],
        marketResults,
    newsBriefs: [],
        quantScorecards,
        quantScenarios,
        riskCheckpoints: [],
        runDate: dateResolution.effectiveReportDate
      });
    } catch (error) {
      console.warn(
        "[public-briefing] falling back to rule-based summary",
        error instanceof Error ? error.message : error
      );
    }
  }

  const fallbackBriefing = buildRuleBasedBriefing(marketResults);

  return buildPublicDailyBriefing({
    runDate: dateResolution.effectiveReportDate,
    summaryLine:
      composition?.oneLineSummary ??
      fallbackBriefing.summaryLine,
    marketResults,
    keyIndicatorBullets: fallbackBriefing.keyIndicatorBullets,
    marketBullets: composition?.marketBullets?.length
      ? composition.marketBullets
      : fallbackBriefing.marketBullets,
    macroBullets: composition?.macroBullets?.length
      ? composition.macroBullets
      : fallbackBriefing.macroBullets,
    fundFlowBullets: composition?.fundFlowBullets?.length
      ? composition.fundFlowBullets
      : fallbackBriefing.fundFlowBullets,
    eventBullets: composition?.eventBullets?.length
      ? composition.eventBullets
      : fallbackBriefing.eventBullets,
    riskBullets: composition?.riskBullets?.length
      ? composition.riskBullets
      : fallbackBriefing.riskBullets
  });
}

export function buildPublicReportInsertInput(input: {
  briefing: Awaited<ReturnType<typeof buildPublicBriefing>>;
}): {
  contentMarkdown: string;
  indicatorTags: string[];
  marketRegime: string;
  reportDate: string;
  signals: string[];
  summary: string;
  totalScore: string;
} {
  const marketRegime = deriveMarketRegime(input.briefing);
  const totalScore = deriveTotalScore(input.briefing);

  return {
    reportDate: input.briefing.runDate,
    summary: input.briefing.summaryLine,
    marketRegime,
    totalScore: totalScore.toFixed(2),
    signals: input.briefing.keyIndicatorBullets.slice(0, 3),
    indicatorTags: input.briefing.indicatorTags,
    contentMarkdown: renderPublicDailyBriefingMarkdown(input.briefing)
  };
}

export function formatPublicBriefingBuildSummary(input: {
  outputPath: string;
  runDate: string;
  snapshotCount: number;
}): string {
  return [
    `[public-briefing] runDate=${input.runDate}`,
    `snapshotCount=${input.snapshotCount}`,
    `outputPath=${input.outputPath}`
  ].join(" ");
}

export async function runPublicBriefing(
  env: Environment = process.env
): Promise<{
  persistedReportId?: string;
  outputPath: string;
  runDate: string;
  snapshotCount: number;
}> {
  const runDate = readRunDate(env);
  const outputPath = readPublicBriefingOutputPath(env);
  const marketDataAdapter = new CompositeMarketDataAdapter({
    fredAdapter: new FredMarketDataAdapter({
      apiKey: readFredApiKey(env)
    }),
    yahooFinanceAdapter: new YahooFinanceScrapingMarketDataAdapter()
  });
  const reportCompositionService = buildReportCompositionService(env);
  const buildInput: PublicBriefingBuilderDependencies = {
    marketDataAdapter,
    runDate
  };

  if (reportCompositionService) {
    buildInput.reportCompositionService = reportCompositionService;
  }

  const briefing = await buildPublicBriefing(buildInput);
  const databaseUrl = readOptionalDatabaseUrl(env);
  let persistedReportId: string | undefined;

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(briefing, null, 2)}\n`);

  if (databaseUrl) {
    const pool = createPool(databaseUrl);

    try {
      const repository = new PublicReportRepository(createDatabase(pool));
      const created = await repository.insertReport(
        buildPublicReportInsertInput({
          briefing
        })
      );
      persistedReportId = created.id;
    } finally {
      await pool.end();
    }
  }

  return {
    ...(persistedReportId ? { persistedReportId } : {}),
    runDate: briefing.runDate,
    outputPath,
    snapshotCount: briefing.marketSnapshot.length
  };
}

async function main(): Promise<void> {
  const result = await runPublicBriefing();

  console.log(
    formatPublicBriefingBuildSummary({
      outputPath: result.outputPath,
      runDate: result.runDate,
      snapshotCount: result.snapshotCount
    })
  );
}

function buildReportCompositionService(
  env: Environment
): DailyReportCompositionService | undefined {
  const llmProvider = readLlmProvider(env);
  const openAiApiKey = readOpenAiApiKey(env);
  const geminiApiKey = readGeminiApiKey(env);
  const selectedProvider =
    llmProvider ??
    (openAiApiKey ? "openai" : geminiApiKey ? "google" : undefined);
  const apiKey =
    selectedProvider === "openai"
      ? openAiApiKey
      : selectedProvider === "google"
        ? geminiApiKey
        : undefined;

  if (!selectedProvider || !apiKey) {
    return undefined;
  }

  const llmClient = createLlmClient({
    apiKey,
    providerProfile:
      selectedProvider === "google"
        ? GOOGLE_PROVIDER_PROFILE
        : OPENAI_PROVIDER_PROFILE
  });

  return new DailyReportCompositionService({
    llmClient
  });
}

function readOptionalDatabaseUrl(env: Environment): string | undefined {
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl || databaseUrl === "replace-me") {
    return undefined;
  }

  return databaseUrl;
}

function deriveMarketRegime(
  briefing: Awaited<ReturnType<typeof buildPublicBriefing>>
): string {
  const negativeSignals = [
    ...briefing.keyIndicatorBullets.filter(
      (bullet) =>
        bullet.includes("변동성") ||
        bullet.includes("약세") ||
        bullet.includes("환율 부담")
    )
  ].length;
  const positiveSignals = [
    ...briefing.keyIndicatorBullets.filter(
      (bullet) => bullet.includes("강세") || bullet.includes("수요 기대")
    )
  ].length;

  if (negativeSignals - positiveSignals >= 2) {
    return "Risk-Off";
  }

  if (positiveSignals - negativeSignals >= 2) {
    return "Risk-On";
  }

  return "Neutral";
}

function deriveTotalScore(
  briefing: Awaited<ReturnType<typeof buildPublicBriefing>>
): number {
  return Number.parseFloat(
    (
      briefing.keyIndicatorBullets.reduce((score, bullet) => {
        if (bullet.includes("변동성") || bullet.includes("약세")) {
          return score - 0.2;
        }

        if (bullet.includes("강세") || bullet.includes("수요 기대")) {
          return score + 0.15;
        }

        if (bullet.includes("환율 부담")) {
          return score - 0.1;
        }

        return score;
      }, 0)
    ).toFixed(2)
  );
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
