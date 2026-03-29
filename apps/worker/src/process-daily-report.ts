import {
  CompositeMarketDataAdapter,
  type BriefingSession,
  createLlmClient,
  DailyReportCompositionService,
  DailyReportOrchestrator,
  DEFAULT_DAILY_REPORT_PROMPT_VERSION,
  DEFAULT_DAILY_REPORT_SKILL_VERSION,
  FredMarketDataAdapter,
  GOOGLE_PROVIDER_PROFILE,
  GoogleNewsRssAdapter,
  listScheduledBriefingSessionsForDate,
  MacroTrendNewsService,
  NoopNewsCacheAdapter,
  parseBriefingSession,
  OPENAI_PROVIDER_PROFILE,
  PortfolioNewsBriefService,
  resolveScheduledBriefingSession,
  TelegramBotApiClient,
  TelegramReportDeliveryAdapter,
  UpstashNewsCacheAdapter,
  YahooHoldingPriceSnapshotProvider,
  YahooFinanceScrapingMarketDataAdapter
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  DEFAULT_MARKET_WATCH_CATALOG,
  PersonalRebalancingSnapshotRepository,
  PortfolioHoldingRepository,
  PublicReportRepository,
  ReportRunRepository,
  StrategySnapshotRepository,
  TelegramOutboundMessageRepository,
  UserRepository
} from "@stock-chatbot/database";

type Environment = Record<string, string | undefined>;
type LlmProviderRuntime = "google" | "openai";

type OrchestratorPort = {
  runForUser(input: {
    briefingSession?: BriefingSession;
    promptVersion?: string;
    publicBriefingUrl?: string;
    runDate: string;
    scheduleType: string;
    skillVersion?: string;
    user: {
      displayName: string;
      id: string;
      includePublicBriefingLink?: boolean;
      reportDetailLevel?: "compact" | "standard";
    };
  }): Promise<{
    publicBriefingLinked?: boolean;
    status: "completed" | "failed" | "partial_success" | "skipped_duplicate";
    reportText: string;
  }>;
};

type ReportDeliveryAdapterPort = {
  deliver(input: {
    channel: "telegram";
    recipientId: string;
    renderedText: string;
  }): Promise<unknown>;
};

type UserRepositoryPort = {
  listUsers(): Promise<
    Array<{
      dailyReportEnabled?: boolean;
      dailyReportHour?: number;
      dailyReportMinute?: number;
      displayName: string;
      id: string;
      includePublicBriefingLink?: boolean;
      isBlocked?: boolean;
      isRegistered?: boolean;
      preferredDeliveryChatId?: string | null;
      reportDetailLevel?: string | null;
      timezone?: string | null;
    }>
  >;
};

export type DailyReportJobSummary = {
  completedCount: number;
  deliveredCount: number;
  deliveryFailedCount: number;
  deliverySkippedCount: number;
  failedCount: number;
  linkAttachedCount: number;
  notDueCount: number;
  partialSuccessCount: number;
  skippedDuplicateCount: number;
  userCount: number;
};

export type DailyReportScheduleType =
  | "daily-post-market"
  | "daily-pre-market"
  | "manual-post-market"
  | "manual-pre-market";

type SchedulableUser = Awaited<ReturnType<UserRepositoryPort["listUsers"]>>[number];

export function readDatabaseUrl(env: Environment = process.env): string {
  return env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
}

export function readFredApiKey(env: Environment = process.env): string {
  const apiKey = env.FRED_API_KEY;

  if (!apiKey || apiKey === "replace-me") {
    throw new Error("FRED_API_KEY is missing");
  }

  return apiKey;
}

export function readOpenAiApiKey(
  env: Environment = process.env
): string | undefined {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "replace-me") {
    return undefined;
  }

  return apiKey;
}

export function readGeminiApiKey(
  env: Environment = process.env
): string | undefined {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "replace-me") {
    return undefined;
  }

  return apiKey;
}

export function readTelegramBotToken(
  env: Environment = process.env
): string | undefined {
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token || token === "replace-me") {
    return undefined;
  }

  return token;
}

export function readLlmProvider(
  env: Environment = process.env
): LlmProviderRuntime | undefined {
  if (env.LLM_PROVIDER === "openai" || env.LLM_PROVIDER === "google") {
    return env.LLM_PROVIDER;
  }

  return undefined;
}

export function readRunDate(
  env: Environment = process.env,
  options?: {
    now?: Date;
    timeZone?: string;
  }
): string {
  const runDate = env.REPORT_RUN_DATE?.trim();

  if (runDate && env.REPORT_TRIGGER_TYPE !== "schedule") {
    return runDate;
  }

  return getRunDateForTimezone(
    options?.timeZone ?? env.REPORT_TIMEZONE ?? "Asia/Seoul",
    options?.now
  );
}

export function readPublicBriefingBaseUrl(
  env: Environment = process.env
): string | undefined {
  const baseUrl = env.PUBLIC_BRIEFING_BASE_URL?.trim();

  if (!baseUrl) {
    return undefined;
  }

  return baseUrl.replace(/\/+$/, "");
}

export function readUpstashRedisRestUrl(
  env: Environment = process.env
): string | undefined {
  const value = env.UPSTASH_REDIS_REST_URL?.trim();

  if (!value || value === "replace-me") {
    return undefined;
  }

  return value;
}

export function readUpstashRedisRestToken(
  env: Environment = process.env
): string | undefined {
  const value = env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!value || value === "replace-me") {
    return undefined;
  }

  return value;
}

export function buildNewsCacheAdapter(env: Environment = process.env) {
  if (isNewsCacheDisabled(env)) {
    return new NoopNewsCacheAdapter();
  }

  const url = readUpstashRedisRestUrl(env);
  const token = readUpstashRedisRestToken(env);

  if (!url || !token) {
    return new NoopNewsCacheAdapter();
  }

  return new UpstashNewsCacheAdapter({
    token,
    url
  });
}

export function isNewsCacheDisabled(env: Environment = process.env): boolean {
  const value = env.DISABLE_UPSTASH_NEWS_CACHE?.trim().toLowerCase();

  return value === "1" || value === "true" || value === "yes";
}

export function readScheduleType(
  env: Environment = process.env,
  briefingSession: BriefingSession = "pre_market"
): DailyReportScheduleType {
  if (env.REPORT_TRIGGER_TYPE === "workflow_dispatch") {
    return briefingSession === "pre_market"
      ? "manual-pre-market"
      : "manual-post-market";
  }

  return briefingSession === "pre_market"
    ? "daily-pre-market"
    : "daily-post-market";
}

export function readScheduleWindowMinutes(
  env: Environment = process.env
): number {
  const raw = env.DAILY_REPORT_WINDOW_MINUTES?.trim();

  if (!raw) {
    return 15;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 59) {
    return 15;
  }

  return parsed;
}

export function isUserDueForScheduledReport(input: {
  now: Date;
  user: SchedulableUser;
  windowMinutes?: number;
}): boolean {
  if (input.user.dailyReportEnabled === false) {
    return false;
  }

  const timeZone = input.user.timezone ?? "Asia/Seoul";
  const dueHour = input.user.dailyReportHour ?? 8;
  const dueMinute = input.user.dailyReportMinute ?? 0;
  const windowMinutes = input.windowMinutes ?? 15;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone
  });
  const parts = formatter.formatToParts(input.now);
  const currentHour = Number.parseInt(
    parts.find((part) => part.type === "hour")?.value ?? "0",
    10
  );
  const currentMinute = Number.parseInt(
    parts.find((part) => part.type === "minute")?.value ?? "0",
    10
  );
  const scheduledTotalMinutes = dueHour * 60 + dueMinute;
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const diff = currentTotalMinutes - scheduledTotalMinutes;

  return diff >= 0 && diff < windowMinutes;
}

export async function processDailyReportJob(
  dependencies: {
    briefingSession: BriefingSession;
    deliveryAdapter?: ReportDeliveryAdapterPort;
    now?: Date;
    orchestrator: OrchestratorPort;
    publicBriefingUrl?: string;
    runDate: string;
    scheduleWindowMinutes?: number;
    scheduleType: DailyReportScheduleType;
    userRepository: UserRepositoryPort;
  }
): Promise<DailyReportJobSummary> {
  const users = await dependencies.userRepository.listUsers();
  const summary: DailyReportJobSummary = {
    userCount: users.length,
    completedCount: 0,
    deliveredCount: 0,
    deliveryFailedCount: 0,
    deliverySkippedCount: 0,
    failedCount: 0,
    linkAttachedCount: 0,
    notDueCount: 0,
    partialSuccessCount: 0,
    skippedDuplicateCount: 0
  };
  const usersToProcess = users.filter((user) => {
    if (
      user.dailyReportEnabled === false ||
      user.isBlocked === true ||
      user.isRegistered === false
    ) {
      summary.notDueCount += 1;
      return false;
    }

    return true;
  });

  for (const user of usersToProcess) {
    const orchestratorUser: {
      displayName: string;
      id: string;
      includePublicBriefingLink?: boolean;
      reportDetailLevel?: "compact" | "standard";
    } = {
      id: user.id,
      displayName: user.displayName
    };

    if (user.includePublicBriefingLink !== undefined) {
      orchestratorUser.includePublicBriefingLink = user.includePublicBriefingLink;
    }

    if (user.reportDetailLevel === "compact" || user.reportDetailLevel === "standard") {
      orchestratorUser.reportDetailLevel = user.reportDetailLevel;
    }

    const result = await dependencies.orchestrator.runForUser({
      promptVersion: DEFAULT_DAILY_REPORT_PROMPT_VERSION,
      skillVersion: DEFAULT_DAILY_REPORT_SKILL_VERSION,
      briefingSession: dependencies.briefingSession,
      ...(dependencies.publicBriefingUrl
        ? { publicBriefingUrl: dependencies.publicBriefingUrl }
        : {}),
      user: orchestratorUser,
      runDate: dependencies.runDate,
      scheduleType: dependencies.scheduleType
    });

    switch (result.status) {
      case "completed":
        summary.completedCount += 1;
        break;
      case "failed":
        summary.failedCount += 1;
        break;
      case "partial_success":
        summary.partialSuccessCount += 1;
        break;
      case "skipped_duplicate":
        summary.skippedDuplicateCount += 1;
        break;
    }

    if (
      result.status !== "completed" &&
      result.status !== "partial_success"
    ) {
      continue;
    }

    if (result.publicBriefingLinked) {
      summary.linkAttachedCount += 1;
    }

    if (!user.preferredDeliveryChatId || !dependencies.deliveryAdapter) {
      summary.deliverySkippedCount += 1;
      continue;
    }

    try {
      await dependencies.deliveryAdapter.deliver({
        channel: "telegram",
        recipientId: user.preferredDeliveryChatId,
        renderedText: result.reportText
      });
      summary.deliveredCount += 1;
    } catch {
      summary.deliveryFailedCount += 1;
    }
  }

  return summary;
}

function getRunDateForTimezone(
  timeZone: string,
  now: Date = new Date()
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export function buildDailyReportJobProcessor(
  env: Environment = process.env
): (input?: {
  briefingSession?: BriefingSession;
  publicBriefingUrl?: string;
  runDate?: string;
}) => Promise<DailyReportJobSummary> {
  const databaseUrl = readDatabaseUrl(env);
  const fredApiKey = readFredApiKey(env);
  const openAiApiKey = readOpenAiApiKey(env);
  const geminiApiKey = readGeminiApiKey(env);
  const telegramBotToken = readTelegramBotToken(env);
  const llmProvider = readLlmProvider(env);
  const scheduleWindowMinutes = readScheduleWindowMinutes(env);
  const publicBriefingBaseUrl = readPublicBriefingBaseUrl(env);
  const selectedProvider =
    llmProvider ??
    (openAiApiKey ? "openai" : geminiApiKey ? "google" : undefined);
  const llmApiKey =
    selectedProvider === "openai" ? openAiApiKey : selectedProvider === "google" ? geminiApiKey : undefined;

  return async (input = {}) => {
    const runDate = input.runDate ?? readRunDate(env);
    const briefingSession = input.briefingSession ?? readBriefingSession(env);
    const scheduleType = readScheduleType(env, briefingSession);
    const pool = createPool(databaseUrl);
    const db = createDatabase(pool);
    const userRepository = new UserRepository(db);
    const orchestratorDependencies: ConstructorParameters<
      typeof DailyReportOrchestrator
    >[0] = {
      defaultMarketItems: DEFAULT_MARKET_WATCH_CATALOG.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        sourceKey: item.sourceKey
      })),
      holdingPriceSnapshotProvider: new YahooHoldingPriceSnapshotProvider(),
      marketDataAdapter: new CompositeMarketDataAdapter({
        fredAdapter: new FredMarketDataAdapter({
          apiKey: fredApiKey
        }),
        yahooFinanceAdapter: new YahooFinanceScrapingMarketDataAdapter()
      }),
      personalRebalancingSnapshotRepository: new PersonalRebalancingSnapshotRepository(db),
      portfolioHoldingRepository: new PortfolioHoldingRepository(db),
      ...(publicBriefingBaseUrl ? { publicBriefingBaseUrl } : {}),
      publicReportRepository: new PublicReportRepository(db),
      reportRunRepository: new ReportRunRepository(db),
      strategySnapshotRepository: new StrategySnapshotRepository(db)
    };

    if (selectedProvider && llmApiKey) {
      const llmClient = createLlmClient({
        apiKey: llmApiKey,
        providerProfile:
          selectedProvider === "google"
            ? GOOGLE_PROVIDER_PROFILE
            : OPENAI_PROVIDER_PROFILE
      });

      orchestratorDependencies.portfolioNewsBriefService =
        new PortfolioNewsBriefService({
          llmClient,
          newsCollectionAdapter: new GoogleNewsRssAdapter()
        });
      orchestratorDependencies.macroTrendNewsService = new MacroTrendNewsService({
        cache: buildNewsCacheAdapter(env)
      });
      orchestratorDependencies.reportCompositionService =
        new DailyReportCompositionService({
          llmClient
        });
    }

    const orchestrator = new DailyReportOrchestrator(orchestratorDependencies);
    const deliveryAdapter = telegramBotToken
      ? new TelegramReportDeliveryAdapter({
          auditPort: new TelegramOutboundMessageRepository(db),
          telegramClient: new TelegramBotApiClient({
            token: telegramBotToken
          })
        })
      : undefined;

    try {
      return await processDailyReportJob({
        briefingSession,
        ...(deliveryAdapter ? { deliveryAdapter } : {}),
        orchestrator,
        ...(input.publicBriefingUrl
          ? { publicBriefingUrl: input.publicBriefingUrl }
          : {}),
        runDate,
        scheduleType,
        scheduleWindowMinutes,
        userRepository
      });
    } finally {
      await pool.end();
    }
  };
}

export function readBriefingSession(
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
        "No scheduled briefing session is allowed for the current date.",
        `Allowed sessions for this date: ${allowedSessions.join(", ") || "none"}`
      ].join(" ")
    );
  }

  return resolved;
}
