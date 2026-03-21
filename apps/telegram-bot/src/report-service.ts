import {
  CompositeMarketDataAdapter,
  createLlmClient,
  DailyReportCompositionService,
  DailyReportOrchestrator,
  type DailyReportOrchestratorResult,
  FredMarketDataAdapter,
  GOOGLE_PROVIDER_PROFILE,
  GoogleNewsRssAdapter,
  OPENAI_PROVIDER_PROFILE,
  PortfolioNewsBriefService,
  YahooFinanceScrapingMarketDataAdapter
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  PortfolioHoldingRepository,
  PublicReportRepository,
  ReportRunRepository,
  StrategySnapshotRepository,
  UserMarketWatchItemRepository,
  UserRepository
} from "@stock-chatbot/database";

type Environment = Record<string, string | undefined>;

type UserRepositoryPort = {
  getByTelegramUserId(telegramUserId: string): Promise<
    | {
        displayName: string;
        id: string;
        includePublicBriefingLink?: boolean;
        preferredDeliveryChatId?: string | null;
        reportDetailLevel?: string | null;
      }
    | null
  >;
};

type OrchestratorPort = Pick<DailyReportOrchestrator, "runForUser">;

export class TelegramReportService {
  constructor(
    private readonly dependencies: {
      orchestrator: OrchestratorPort;
      userRepository: UserRepositoryPort;
    }
  ) {}

  async runForTelegramUser(input: {
    runDate: string;
    telegramUserId: string;
  }): Promise<DailyReportOrchestratorResult> {
    const user = await this.dependencies.userRepository.getByTelegramUserId(
      input.telegramUserId
    );

    if (!user) {
      throw new Error("USER_NOT_REGISTERED");
    }

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

    return this.dependencies.orchestrator.runForUser({
      user: orchestratorUser,
      runDate: input.runDate,
      scheduleType: "telegram-report"
    });
  }
}

export function buildTelegramReportRuntime(env: Environment = process.env): {
  close: () => Promise<void>;
  reportService: TelegramReportService;
} {
  const databaseUrl =
    env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot";
  const fredApiKey = readRequiredApiKey(env.FRED_API_KEY, "FRED_API_KEY");
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
    publicReportRepository: new PublicReportRepository(db),
    reportRunRepository: new ReportRunRepository(db),
    strategySnapshotRepository: new StrategySnapshotRepository(db),
    userMarketWatchRepository: new UserMarketWatchItemRepository(db)
  };
  const publicBriefingBaseUrl = env.PUBLIC_BRIEFING_BASE_URL?.trim();

  if (publicBriefingBaseUrl) {
    orchestratorDependencies.publicBriefingBaseUrl =
      publicBriefingBaseUrl.replace(/\/+$/, "");
  }

  const llmClient = buildLlmClient(env);

  if (llmClient) {
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

  return {
    reportService: new TelegramReportService({
      orchestrator: new DailyReportOrchestrator(orchestratorDependencies),
      userRepository
    }),
    close: async () => {
      await pool.end();
    }
  };
}

export function getRunDateForTimezone(
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

function buildLlmClient(env: Environment) {
  const llmProvider = env.LLM_PROVIDER;
  const openAiApiKey = readOptionalApiKey(env.OPENAI_API_KEY);
  const geminiApiKey = readOptionalApiKey(env.GEMINI_API_KEY);
  const selectedProvider =
    llmProvider === "openai" || llmProvider === "google"
      ? llmProvider
      : openAiApiKey
        ? "openai"
        : geminiApiKey
          ? "google"
          : undefined;
  const apiKey =
    selectedProvider === "openai"
      ? openAiApiKey
      : selectedProvider === "google"
        ? geminiApiKey
        : undefined;

  if (!selectedProvider || !apiKey) {
    return undefined;
  }

  return createLlmClient({
    apiKey,
    providerProfile:
      selectedProvider === "google"
        ? GOOGLE_PROVIDER_PROFILE
        : OPENAI_PROVIDER_PROFILE
  });
}

function readOptionalApiKey(value?: string): string | undefined {
  if (!value || value === "replace-me") {
    return undefined;
  }

  return value;
}

function readRequiredApiKey(value: string | undefined, name: string): string {
  if (!value || value === "replace-me") {
    throw new Error(`${name} is missing`);
  }

  return value;
}
