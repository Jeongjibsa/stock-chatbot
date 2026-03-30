import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

import {
  type BriefingSession,
  buildPublicDailyBriefing,
  buildPublicReportDetailUrl,
  buildRuleBasedBriefing,
  buildQuantScorecards,
  CompositeMarketDataAdapter,
  DailyReportCompositionService,
  diversifyPublicKeyIndicatorBullets,
  FredMarketDataAdapter,
  createLlmClient,
  GOOGLE_PROVIDER_PROFILE,
  listScheduledBriefingSessionsForDate,
  MacroTrendNewsService,
  OPENAI_PROVIDER_PROFILE,
  parseBriefingSession,
  repairPublicHeadlineEvents,
  repairPublicKeyIndicatorBullets,
  repairPublicSummaryLine,
  resolveScheduledBriefingSession,
  renderPublicDailyBriefingMarkdown,
  toQuantStrategyBullets,
  YahooFinanceScrapingMarketDataAdapter,
  type DailyReportComposition,
  type MacroTrendBrief,
  type MarketDataAdapter
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  DEFAULT_MARKET_WATCH_CATALOG,
  NewsAnalysisResultRepository,
  NewsItemRepository,
  PublicReportRepository
} from "@stock-chatbot/database";

import {
  buildNewsCacheAdapter,
  readFredApiKey,
  readGeminiApiKey,
  readLlmProvider,
  readOpenAiApiKey,
  readRunDate
} from "./process-daily-report.js";

type Environment = Record<string, string | undefined>;

type PublicBriefingBuilderDependencies = {
  briefingSession: BriefingSession;
  compositionTimeoutMs?: number;
  marketDataAdapter: MarketDataAdapter;
  macroTrendBriefs?: MacroTrendBrief[];
  priorPublicReport?: {
    signals: string[];
    summary?: string | null;
  };
  reportCompositionService?: Pick<DailyReportCompositionService, "compose">;
  runDate: string;
  sessionComparison?: {
    priorPublicSignals?: string[];
    priorPublicSummary?: string | null;
  };
};

const WORKER_SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(WORKER_SOURCE_DIR, "../../..");

export function resolveDefaultPublicBriefingOutputPath(input: {
  briefingSession: BriefingSession;
}): string {
  return join(
    REPOSITORY_ROOT,
    "artifacts",
    "public-briefing",
    `public-daily-briefing-${input.briefingSession}.json`
  );
}

export function readPublicBriefingOutputPath(
  env: Environment = process.env
): string {
  const explicitOutputPath = env.PUBLIC_BRIEFING_OUTPUT_PATH?.trim();

  if (explicitOutputPath) {
    return explicitOutputPath;
  }

  const briefingSession = readPublicBriefingSession(env);

  return resolveDefaultPublicBriefingOutputPath({ briefingSession });
}

export function readPublicBriefingLlmTimeoutMs(
  env: Environment = process.env
): number {
  const raw = env.PUBLIC_BRIEFING_LLM_TIMEOUT_MS?.trim();

  if (!raw) {
    return 8_000;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 8_000;
  }

  return parsed;
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
  const macroTrendBriefs = dependencies.macroTrendBriefs ?? [];
  let composition: DailyReportComposition | undefined;

  if (dependencies.reportCompositionService) {
    try {
      composition = await dependencies.reportCompositionService.compose({
        audience: "public_web",
        briefingSession: dependencies.briefingSession,
        holdings: [],
        marketResults,
        macroTrendBriefs,
        newsBriefs: [],
        quantScorecards,
        quantScenarios,
        riskCheckpoints: [],
        runDate: dependencies.runDate,
        ...(dependencies.compositionTimeoutMs
          ? { timeoutMs: dependencies.compositionTimeoutMs }
          : {}),
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

  const fallbackBriefing = buildRuleBasedBriefing(marketResults, {
    briefingSession: dependencies.briefingSession
  });
  const selectedKeyIndicatorBullets = composition
    ? (() => {
        const repaired = repairPublicKeyIndicatorBullets(
          {
            oneLineSummary: composition.oneLineSummary,
            marketBullets: composition.marketBullets,
            macroBullets: composition.macroBullets,
            fundFlowBullets: composition.fundFlowBullets,
            eventBullets: composition.eventBullets,
            holdingTrendBullets: composition.holdingTrendBullets,
            articleSummaryBullets: composition.articleSummaryBullets,
            keyIndicatorBullets: composition.keyIndicatorBullets,
            headlineEvents: composition.headlineEvents,
            strategyBullets: composition.strategyBullets,
            riskBullets: composition.riskBullets,
            trendNewsBullets: composition.trendNewsBullets,
            newsReferences: composition.newsReferences
          },
          dependencies.briefingSession
        );

        return repaired.length > 0 ? repaired : fallbackBriefing.keyIndicatorBullets;
      })()
    : fallbackBriefing.keyIndicatorBullets;
  const diversifiedKeyIndicatorBullets = diversifyPublicKeyIndicatorBullets({
    briefingSession: dependencies.briefingSession,
    macroTrendBriefs,
    ...(dependencies.priorPublicReport?.signals
      ? { priorSignals: dependencies.priorPublicReport.signals }
      : {}),
    signals: selectedKeyIndicatorBullets
  });
  const repairedHeadlineEvents = repairPublicHeadlineEvents({
    briefingSession: dependencies.briefingSession,
    headlineEvents:
      composition?.headlineEvents?.length
        ? composition.headlineEvents
        : buildFallbackHeadlineEvents(
            macroTrendBriefs,
            dependencies.briefingSession
          ),
    macroTrendBriefs
  });
  const repairedSummaryLine = repairPublicSummaryLine({
    briefingSession: dependencies.briefingSession,
    currentSummary:
      composition?.oneLineSummary ??
      fallbackBriefing.summaryLine,
    keyIndicatorBullets: diversifiedKeyIndicatorBullets,
    macroTrendBriefs,
    ...(dependencies.priorPublicReport?.signals
      ? { priorSignals: dependencies.priorPublicReport.signals }
      : {}),
    ...(dependencies.priorPublicReport?.summary !== undefined
      ? { priorSummary: dependencies.priorPublicReport.summary }
      : {})
  });

  return buildPublicDailyBriefing({
    briefingSession: dependencies.briefingSession,
    runDate: dependencies.runDate,
    summaryLine: repairedSummaryLine,
    marketResults,
    keyIndicatorBullets: diversifiedKeyIndicatorBullets,
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
    headlineEvents: repairedHeadlineEvents,
    riskBullets: composition?.riskBullets?.length
      ? composition.riskBullets
      : fallbackBriefing.riskBullets,
    trendNewsBullets: composition?.trendNewsBullets?.length
      ? composition.trendNewsBullets
      : macroTrendBriefs.map((brief) => brief.summary).slice(0, 5),
    newsReferences: composition?.newsReferences?.length
      ? composition.newsReferences
      : macroTrendBriefs.flatMap((brief) => brief.references).slice(0, 6)
  });
}

export function buildPublicReportInsertInput(input: {
  briefing: Awaited<ReturnType<typeof buildPublicBriefing>>;
}): {
  briefingSession: BriefingSession;
  contentMarkdown: string;
  indicatorTags: string[];
  marketRegime: string;
  newsReferences: Array<{ sourceLabel: string; title: string; url: string }>;
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
    newsReferences: input.briefing.newsReferences,
    contentMarkdown: renderPublicDailyBriefingMarkdown(input.briefing)
  };
}

function buildFallbackHeadlineEvents(
  macroTrendBriefs: MacroTrendBrief[],
  briefingSession: BriefingSession
) {
  return macroTrendBriefs
    .flatMap((brief) =>
      brief.references.slice(0, 2).map((reference) => ({
        sourceLabel: reference.sourceLabel,
        headline: reference.title,
        summary: `${briefingSession === "post_market" ? "오늘 밤" : briefingSession === "weekend_briefing" ? "다음 주" : "개장 전"} 시장 해석에서는 ${brief.summary.replace(/^공개 시장 해석 기준으로\s*/u, "")}`
      }))
    )
    .slice(0, 4);
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

export function resolveFallbackPublicBriefingOutputPath(input: {
  briefingSession: BriefingSession;
}): string {
  return `${tmpdir()}/public-briefing/public-daily-briefing-${input.briefingSession}.json`;
}

export function persistPublicBriefingArtifact(
  input: {
    briefing: Awaited<ReturnType<typeof buildPublicBriefing>>;
    preferredOutputPath: string;
  },
  dependencies: {
    mkdirSyncImpl?: typeof mkdirSync;
    warn?: typeof console.warn;
    writeFileSyncImpl?: typeof writeFileSync;
  } = {}
): string {
  const mkdirSyncImpl = dependencies.mkdirSyncImpl ?? mkdirSync;
  const warn = dependencies.warn ?? console.warn;
  const writeFileSyncImpl = dependencies.writeFileSyncImpl ?? writeFileSync;

  try {
    writeBriefingArtifactFile(
      input.preferredOutputPath,
      input.briefing,
      mkdirSyncImpl,
      writeFileSyncImpl
    );
    return input.preferredOutputPath;
  } catch (error) {
    if (!isRecoverableArtifactWriteError(error)) {
      throw error;
    }

    const fallbackOutputPath = resolveFallbackPublicBriefingOutputPath({
      briefingSession: input.briefing.briefingSession
    });

    warn(
      "[public-briefing] switching artifact output path to temporary storage",
      input.preferredOutputPath,
      fallbackOutputPath,
      error.message
    );
    writeBriefingArtifactFile(
      fallbackOutputPath,
      input.briefing,
      mkdirSyncImpl,
      writeFileSyncImpl
    );
    return fallbackOutputPath;
  }
}

async function loadStoredHistoricalMacroItems(input: {
  newsItemRepository: NewsItemRepository;
  runDate: string;
}): Promise<Awaited<ReturnType<MacroTrendNewsService["collect"]>>> {
  const startDate = new Date(`${input.runDate}T00:00:00+09:00`);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  const startInclusive = startDate.toISOString();
  const endExclusive = endDate.toISOString();
  const storedItems = await input.newsItemRepository.listByPublishedAtRange({
    contentScope: "macro",
    startInclusive,
    endExclusive
  });

  return storedItems.map((item) => ({
    canonicalUrl: item.canonicalUrl,
    collectedAt: item.collectedAt.toISOString(),
    contentScope: "macro" as const,
    newsSourceId: item.newsSourceId,
    newsSourceLabel: item.newsSourceLabel,
    normalizedTitle: item.normalizedTitle,
    publishedAt: item.publishedAt.toISOString(),
    region: item.region === "kr" ? "kr" : "global",
    ...(item.summary ? { summary: item.summary } : {}),
    title: item.title,
    url: item.url
  }));
}

function formatDateInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export async function runPublicBriefing(
  env: Environment = process.env
): Promise<{
  briefingSession: BriefingSession;
  publicBriefingUrl?: string;
  status: "completed" | "missing_link";
  persistedReportId?: string;
  outputPath: string;
  runDate: string;
  snapshotCount: number;
}> {
  const runDate = readRunDate(env);
  const briefingSession = readPublicBriefingSession(env);
  const outputPath = readPublicBriefingOutputPath(env);
  const publicBriefingBaseUrl =
    env.PUBLIC_BRIEFING_BASE_URL?.trim().replace(/\/+$/, "") || undefined;
  const marketDataAdapter = new CompositeMarketDataAdapter({
    fredAdapter: new FredMarketDataAdapter({
      apiKey: readFredApiKey(env)
    }),
    yahooFinanceAdapter: new YahooFinanceScrapingMarketDataAdapter()
  });
  const reportCompositionService = buildReportCompositionService(env);
  const buildInput: PublicBriefingBuilderDependencies = {
    briefingSession,
    compositionTimeoutMs: readPublicBriefingLlmTimeoutMs(env),
    marketDataAdapter,
    runDate
  };
  const macroTrendNewsService = new MacroTrendNewsService({
    cache: buildNewsCacheAdapter(env)
  });

  if (reportCompositionService) {
    buildInput.reportCompositionService = reportCompositionService;
  }

  const databaseUrl = readOptionalDatabaseUrl(env);
  let persistedReportId: string | undefined;
  let publicBriefingUrl: string | undefined;
  let newsAnalysisResultRepository: NewsAnalysisResultRepository | undefined;
  let newsItemRepository: NewsItemRepository | undefined;
  let repository: PublicReportRepository | undefined;
  let pool: Pool | undefined;

  if (databaseUrl) {
    pool = createPool(databaseUrl);
    const db = createDatabase(pool);
    repository = new PublicReportRepository(db);
    newsItemRepository = new NewsItemRepository(db);
    newsAnalysisResultRepository = new NewsAnalysisResultRepository(db);
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

  if (repository) {
    const priorSameSession = await repository.findLatestBeforeReportDateAndSession(
      runDate,
      briefingSession
    );

    if (priorSameSession) {
      buildInput.priorPublicReport = {
        summary: priorSameSession.summary ?? null,
        signals: priorSameSession.signals ?? []
      };
    }
  }

  let collectedMacroItems: Awaited<ReturnType<MacroTrendNewsService["collect"]>> = [];
  let macroTrendBriefs: MacroTrendBrief[] = [];

  try {
    const currentKstDate = formatDateInTimeZone(new Date(), "Asia/Seoul");
    const storedHistoricalMacroItems =
      newsItemRepository && runDate < currentKstDate
        ? await loadStoredHistoricalMacroItems({
            newsItemRepository,
            runDate
          })
        : [];

    if (storedHistoricalMacroItems.length > 0) {
      collectedMacroItems = storedHistoricalMacroItems;
    } else if (runDate < currentKstDate) {
      console.warn(
        "[public-briefing] historical run missing stored macro news, skipping live fetch",
        runDate
      );
    } else {
      collectedMacroItems = await macroTrendNewsService.collect({
        audience: "public_web",
        runDate,
        scope: "macro",
        session: briefingSession
      });
    }

    macroTrendBriefs = await macroTrendNewsService.analyzeMacroTrends({
      audience: "public_web",
      items: collectedMacroItems,
      runDate,
      session: briefingSession
    });
  } catch (error) {
    console.warn(
      "[public-briefing] macro trend enrichment unavailable",
      error instanceof Error ? error.message : error
    );
  }
  buildInput.macroTrendBriefs = macroTrendBriefs;

  const briefing = await buildPublicBriefing(buildInput);

  const persistedOutputPath = persistPublicBriefingArtifact({
    briefing,
    preferredOutputPath: outputPath
  });

  if (repository && pool) {
    try {
      const storedItems = newsItemRepository
        ? await newsItemRepository.insertMany(
            collectedMacroItems.map((item) => ({
              canonicalUrl: item.canonicalUrl,
              collectedAt: item.collectedAt,
              contentScope: item.contentScope,
              newsSourceId: item.newsSourceId,
              newsSourceLabel: item.newsSourceLabel,
              normalizedTitle: item.normalizedTitle,
              publishedAt: item.publishedAt,
              rawPayload: {
                canonicalUrl: item.canonicalUrl,
                ...(item.summary ? { summary: item.summary } : {}),
                title: item.title,
                url: item.url
              },
              region: item.region,
              ...(item.summary ? { summary: item.summary } : {}),
              title: item.title,
              url: item.url
            }))
          )
        : [];
      const storedIds = new Map<string, string>();

      for (const item of storedItems) {
        storedIds.set(item.canonicalUrl, item.id);
        storedIds.set(item.url, item.id);
      }
      await newsAnalysisResultRepository?.upsertMany(
        macroTrendBriefs.map((brief) => ({
          analysisType: "macro_trend",
          audienceScope: "public_web",
          briefingSession,
          confidence: brief.confidence,
          runDate,
          sentiment: brief.sentiment,
          subjectKey: brief.theme,
          summary: brief.summary,
          supportingNewsItemIds: brief.references
            .map((reference) => storedIds.get(reference.url))
            .filter((value): value is string => typeof value === "string"),
          tags: [brief.theme, ...brief.sourceIds]
        }))
      );
      const created = await repository.insertReport(
        buildPublicReportInsertInput({
          briefing
        })
      );
      persistedReportId = created.id;
      if (publicBriefingBaseUrl) {
        publicBriefingUrl = buildPublicReportDetailUrl(
          publicBriefingBaseUrl,
          created.id
        );
      }
    } finally {
      await pool.end();
    }
  }

  return {
    ...(publicBriefingUrl ? { publicBriefingUrl } : {}),
    status: publicBriefingUrl ? "completed" : "missing_link",
    ...(persistedReportId ? { persistedReportId } : {}),
    briefingSession,
    runDate: briefing.runDate,
    outputPath: persistedOutputPath,
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

  if (resolved === "none") {
    const allowedSessions = listScheduledBriefingSessionsForDate({
      timeZone: options?.timeZone ?? env.REPORT_TIMEZONE ?? "Asia/Seoul",
      ...(options?.now ? { now: options.now } : {})
    });

    throw new Error(
      [
        "No public briefing session is allowed for the current date.",
        `Allowed sessions for this date: ${allowedSessions.join(", ") || "none"}`
      ].join(" ")
    );
  }

  return resolved;
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

function writeBriefingArtifactFile(
  outputPath: string,
  briefing: Awaited<ReturnType<typeof buildPublicBriefing>>,
  mkdirSyncImpl: typeof mkdirSync,
  writeFileSyncImpl: typeof writeFileSync
) {
  mkdirSyncImpl(dirname(outputPath), { recursive: true });
  writeFileSyncImpl(outputPath, `${JSON.stringify(briefing, null, 2)}\n`);
}

function isRecoverableArtifactWriteError(
  error: unknown
): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    ["EACCES", "ENOENT", "EPERM", "EROFS"].includes(error.code)
  );
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
