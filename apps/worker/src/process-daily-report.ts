import {
  createLlmClient,
  DailyReportOrchestrator,
  DEFAULT_DAILY_REPORT_PROMPT_VERSION,
  DEFAULT_DAILY_REPORT_SKILL_VERSION,
  FredMarketDataAdapter,
  GoogleNewsRssAdapter,
  PortfolioNewsBriefService
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

type UserRepositoryPort = {
  listUsers(): Promise<Array<{ displayName: string; id: string }>>;
};

export type DailyReportJobSummary = {
  completedCount: number;
  failedCount: number;
  partialSuccessCount: number;
  skippedDuplicateCount: number;
  userCount: number;
};

export type DailyReportScheduleType = "daily-9am" | "manual-dispatch";

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

export function readRunDate(env: Environment = process.env): string {
  return env.REPORT_RUN_DATE ?? new Date().toISOString().slice(0, 10);
}

export function readScheduleType(
  env: Environment = process.env
): DailyReportScheduleType {
  return env.REPORT_TRIGGER_TYPE === "workflow_dispatch"
    ? "manual-dispatch"
    : "daily-9am";
}

export async function processDailyReportJob(
  dependencies: {
    orchestrator: OrchestratorPort;
    runDate: string;
    scheduleType: DailyReportScheduleType;
    userRepository: UserRepositoryPort;
  }
): Promise<DailyReportJobSummary> {
  const users = await dependencies.userRepository.listUsers();
  const summary: DailyReportJobSummary = {
    userCount: users.length,
    completedCount: 0,
    failedCount: 0,
    partialSuccessCount: 0,
    skippedDuplicateCount: 0
  };

  for (const user of users) {
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
  }

  return summary;
}

export function buildDailyReportJobProcessor(env: Environment = process.env): () => Promise<DailyReportJobSummary> {
  const databaseUrl = readDatabaseUrl(env);
  const fredApiKey = readFredApiKey(env);
  const openAiApiKey = readOpenAiApiKey(env);
  const runDate = readRunDate(env);
  const scheduleType = readScheduleType(env);
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);
  const userRepository = new UserRepository(db);
  const orchestratorDependencies: ConstructorParameters<
    typeof DailyReportOrchestrator
  >[0] = {
    marketDataAdapter: new FredMarketDataAdapter({
      apiKey: fredApiKey
    }),
    portfolioHoldingRepository: new PortfolioHoldingRepository(db),
    reportRunRepository: new ReportRunRepository(db),
    userMarketWatchRepository: new UserMarketWatchItemRepository(db)
  };

  if (openAiApiKey) {
    orchestratorDependencies.portfolioNewsBriefService =
      new PortfolioNewsBriefService({
        llmClient: createLlmClient({
          apiKey: openAiApiKey
        }),
        newsCollectionAdapter: new GoogleNewsRssAdapter()
      });
  }

  const orchestrator = new DailyReportOrchestrator(orchestratorDependencies);

  return async () => {
    try {
      return await processDailyReportJob({
        orchestrator,
        runDate,
        scheduleType,
        userRepository
      });
    } finally {
      await pool.end();
    }
  };
}
