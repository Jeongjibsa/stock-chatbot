import {
  CompositeMarketDataAdapter,
  createLlmClient,
  DailyReportCompositionService,
  DailyReportOrchestrator,
  DEFAULT_DAILY_REPORT_PROMPT_VERSION,
  DEFAULT_DAILY_REPORT_SKILL_VERSION,
  FredMarketDataAdapter,
  GOOGLE_PROVIDER_PROFILE,
  GoogleNewsRssAdapter,
  OPENAI_PROVIDER_PROFILE,
  PortfolioNewsBriefService,
  TelegramBotApiClient,
  TelegramReportDeliveryAdapter,
  YahooFinanceScrapingMarketDataAdapter
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  PortfolioHoldingRepository,
  ReportRunRepository,
  UserMarketWatchItemRepository,
  UserRepository
} from "@stock-chatbot/database";

type Environment = Record<string, string | undefined>;
type LlmProviderRuntime = "google" | "openai";

type OrchestratorPort = {
  runForUser(input: {
    promptVersion?: string;
    runDate: string;
    scheduleType: string;
    skillVersion?: string;
    user: {
      displayName: string;
      id: string;
    };
  }): Promise<{
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
      preferredDeliveryChatId?: string | null;
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
  notDueCount: number;
  partialSuccessCount: number;
  skippedDuplicateCount: number;
  userCount: number;
};

export type DailyReportScheduleType = "daily-9am" | "manual-dispatch";

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

export function readRunDate(env: Environment = process.env): string {
  const runDate = env.REPORT_RUN_DATE?.trim();

  if (runDate) {
    return runDate;
  }

  return new Date().toISOString().slice(0, 10);
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

export function readScheduleType(
  env: Environment = process.env
): DailyReportScheduleType {
  return env.REPORT_TRIGGER_TYPE === "workflow_dispatch"
    ? "manual-dispatch"
    : "daily-9am";
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
  const dueHour = input.user.dailyReportHour ?? 9;
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
    deliveryAdapter?: ReportDeliveryAdapterPort;
    now?: Date;
    orchestrator: OrchestratorPort;
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
    notDueCount: 0,
    partialSuccessCount: 0,
    skippedDuplicateCount: 0
  };
  const now = dependencies.now ?? new Date();
  const usersToProcess =
    dependencies.scheduleType === "daily-9am"
      ? users.filter((user) => {
          const due = isUserDueForScheduledReport(
            dependencies.scheduleWindowMinutes === undefined
              ? {
                  now,
                  user
                }
              : {
                  now,
                  user,
                  windowMinutes: dependencies.scheduleWindowMinutes
                }
          );

          if (!due) {
            summary.notDueCount += 1;
          }

          return due;
        })
      : users;

  for (const user of usersToProcess) {
    const result = await dependencies.orchestrator.runForUser({
      promptVersion: DEFAULT_DAILY_REPORT_PROMPT_VERSION,
      skillVersion: DEFAULT_DAILY_REPORT_SKILL_VERSION,
      user,
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

export function buildDailyReportJobProcessor(env: Environment = process.env): () => Promise<DailyReportJobSummary> {
  const databaseUrl = readDatabaseUrl(env);
  const fredApiKey = readFredApiKey(env);
  const openAiApiKey = readOpenAiApiKey(env);
  const geminiApiKey = readGeminiApiKey(env);
  const telegramBotToken = readTelegramBotToken(env);
  const llmProvider = readLlmProvider(env);
  const runDate = readRunDate(env);
  const scheduleType = readScheduleType(env);
  const scheduleWindowMinutes = readScheduleWindowMinutes(env);
  const publicBriefingBaseUrl = readPublicBriefingBaseUrl(env);
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);
  const userRepository = new UserRepository(db);
  const orchestratorDependencies: ConstructorParameters<
    typeof DailyReportOrchestrator
  >[0] = {
    marketDataAdapter: new CompositeMarketDataAdapter({
      fredAdapter: new FredMarketDataAdapter({
        apiKey: fredApiKey
      }),
      yahooFinanceAdapter: new YahooFinanceScrapingMarketDataAdapter()
    }),
    portfolioHoldingRepository: new PortfolioHoldingRepository(db),
    ...(publicBriefingBaseUrl ? { publicBriefingBaseUrl } : {}),
    reportRunRepository: new ReportRunRepository(db),
    userMarketWatchRepository: new UserMarketWatchItemRepository(db)
  };

  const selectedProvider =
    llmProvider ??
    (openAiApiKey ? "openai" : geminiApiKey ? "google" : undefined);
  const llmApiKey =
    selectedProvider === "openai" ? openAiApiKey : selectedProvider === "google" ? geminiApiKey : undefined;

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
    orchestratorDependencies.reportCompositionService =
      new DailyReportCompositionService({
        llmClient
      });
  }

  const orchestrator = new DailyReportOrchestrator(orchestratorDependencies);
  const deliveryAdapter = telegramBotToken
    ? new TelegramReportDeliveryAdapter({
        telegramClient: new TelegramBotApiClient({
          token: telegramBotToken
        })
      })
    : undefined;

  return async () => {
    try {
      return await processDailyReportJob({
        ...(deliveryAdapter ? { deliveryAdapter } : {}),
        orchestrator,
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
