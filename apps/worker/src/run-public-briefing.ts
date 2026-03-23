import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

import {
  type BriefingSession,
  buildPublicDailyBriefing,
  buildRuleBasedBriefing,
  buildQuantScorecards,
  CompositeMarketDataAdapter,
  DailyReportCompositionService,
  FredMarketDataAdapter,
  parseBriefingSession,
  GOOGLE_PROVIDER_PROFILE,
  createLlmClient,
  OPENAI_PROVIDER_PROFILE,
  resolveScheduledBriefingSession,
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
  briefingSession: BriefingSession;
  marketDataAdapter: MarketDataAdapter;
  reportCompositionService?: Pick<DailyReportCompositionService, "compose">;
  runDate: string;
  sessionComparison?: {
    priorPublicSignals?: string[];
    priorPublicSummary?: string | null;
  };
};

export function readPublicBriefingOutputPath(
  env: Environment = process.env
): string {
  const briefingSession = readPublicBriefingSession(env);
  return (
    env.PUBLIC_BRIEFING_OUTPUT_PATH?.trim() ||
    `artifacts/public-briefing/public-daily-briefing-${briefingSession}.json`
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
        briefingSession: dependencies.briefingSession,
        holdings: [],
        marketResults,
        newsBriefs: [],
        quantScorecards,
        quantScenarios,
        riskCheckpoints: [],
        runDate: dependencies.runDate,
        ...(dependencies.sessionComparison
          ? { sessionComparison: dependencies.sessionComparison }
          : {})
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
    briefingSession: dependencies.briefingSession,
    runDate: dependencies.runDate,
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
  briefingSession: BriefingSession;
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
    briefingSession: input.briefing.briefingSession,
    summary: input.briefing.summaryLine,
    marketRegime,
    totalScore: totalScore.toFixed(2),
    signals: input.briefing.keyIndicatorBullets.slice(0, 3),
    indicatorTags: input.briefing.indicatorTags,
    contentMarkdown: renderPublicDailyBriefingMarkdown(input.briefing)
  };
}

export function formatPublicBriefingBuildSummary(input: {
  briefingSession: BriefingSession;
  outputPath: string;
  runDate: string;
  snapshotCount: number;
}): string {
  return [
    `[public-briefing] runDate=${input.runDate}`,
    `session=${input.briefingSession}`,
    `snapshotCount=${input.snapshotCount}`,
    `outputPath=${input.outputPath}`
  ].join(" ");
}

export async function runPublicBriefing(
  env: Environment = process.env
): Promise<{
  briefingSession: BriefingSession;
  persistedReportId?: string;
  outputPath: string;
  runDate: string;
  snapshotCount: number;
}> {
  const runDate = readRunDate(env);
  const briefingSession = readPublicBriefingSession(env);
  const outputPath = readPublicBriefingOutputPath(env);
  const marketDataAdapter = new CompositeMarketDataAdapter({
    fredAdapter: new FredMarketDataAdapter({
      apiKey: readFredApiKey(env)
    }),
    yahooFinanceAdapter: new YahooFinanceScrapingMarketDataAdapter()
  });
  const reportCompositionService = buildReportCompositionService(env);
  const buildInput: PublicBriefingBuilderDependencies = {
    briefingSession,
    marketDataAdapter,
    runDate
  };

  if (reportCompositionService) {
    buildInput.reportCompositionService = reportCompositionService;
  }

  const databaseUrl = readOptionalDatabaseUrl(env);
  let persistedReportId: string | undefined;
  let repository: PublicReportRepository | undefined;
  let pool: Pool | undefined;

  if (databaseUrl) {
    pool = createPool(databaseUrl);
    repository = new PublicReportRepository(createDatabase(pool));
  }

  if (briefingSession === "post_market" && repository) {
    const prior = await repository.findLatestByReportDateAndSession(runDate, "pre_market");

    if (prior) {
      buildInput.sessionComparison = {
        priorPublicSummary: prior.summary ?? null,
        priorPublicSignals: prior.signals ?? []
      };
    }
  }

  const briefing = await buildPublicBriefing(buildInput);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(briefing, null, 2)}\n`);

  if (repository && pool) {
    try {
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
    briefingSession,
    runDate: briefing.runDate,
    outputPath,
    snapshotCount: briefing.marketSnapshot.length
  };
}

export function readPublicBriefingSession(
  env: Environment = process.env,
  options?: {
    now?: Date;
    timeZone?: string;
  }
): BriefingSession {
  const parsed = parseBriefingSession(env.BRIEFING_SESSION?.trim());

  if (parsed) {
    return parsed;
  }

  const resolved = resolveScheduledBriefingSession({
    timeZone: options?.timeZone ?? env.REPORT_TIMEZONE ?? "Asia/Seoul",
    ...(options?.now ? { now: options.now } : {})
  });

  return resolved === "none" ? "pre_market" : resolved;
}

async function main(): Promise<void> {
  const result = await runPublicBriefing();

  console.log(
    formatPublicBriefingBuildSummary({
      briefingSession: result.briefingSession,
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
