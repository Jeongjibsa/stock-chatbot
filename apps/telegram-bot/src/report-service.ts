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
  type PersonalizedPortfolioRebalancingData,
  YahooHoldingPriceSnapshotProvider,
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

const DEFAULT_TELEGRAM_REPORT_ENRICHMENT = false;

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
    portfolioRebalancing?: PersonalizedPortfolioRebalancingData;
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

    const runInput: {
      portfolioRebalancing?: PersonalizedPortfolioRebalancingData;
      runDate: string;
      scheduleType: string;
      user: {
        displayName: string;
        id: string;
        includePublicBriefingLink?: boolean;
        reportDetailLevel?: "compact" | "standard";
      };
    } = {
      user: orchestratorUser,
      runDate: input.runDate,
      scheduleType: "telegram-report"
    };

    if (input.portfolioRebalancing) {
      runInput.portfolioRebalancing = input.portfolioRebalancing;
    }

    return this.dependencies.orchestrator.runForUser(runInput);
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
    holdingPriceSnapshotProvider: new YahooHoldingPriceSnapshotProvider(),
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

  if (llmClient && isTelegramReportEnrichmentEnabled(env)) {
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

export function isTelegramReportEnrichmentEnabled(
  env: Environment = process.env
): boolean {
  const rawValue = env.TELEGRAM_REPORT_ENABLE_ENRICHMENT?.trim().toLowerCase();

  if (!rawValue) {
    return DEFAULT_TELEGRAM_REPORT_ENRICHMENT;
  }

  return rawValue === "1" || rawValue === "true" || rawValue === "yes";
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

export function resolveTelegramReportRunDate(
  env: Environment = process.env,
  options?: {
    now?: Date;
    timeZone?: string;
  }
): string {
  const override = env.REPORT_RUN_DATE?.trim();

  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
    return override;
  }

  return getRunDateForTimezone(options?.timeZone ?? "Asia/Seoul", options?.now);
}

export function resolveTelegramReportFollowUpMessage(
  result: DailyReportOrchestratorResult
): string | null {
  if (result.status === "failed") {
    return "브리핑 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (
    result.status === "skipped_duplicate" &&
    result.reportRun.status === "running" &&
    !result.reportText
  ) {
    return "이미 브리핑을 생성하고 있습니다. 잠시 후 다시 /report 를 실행해 주세요.";
  }

  if (
    result.status === "skipped_duplicate" &&
    result.reportRun.status === "failed" &&
    !result.reportText
  ) {
    return "이전 브리핑 생성이 실패했습니다. 다시 /report 를 실행해 새로 생성해 주세요.";
  }

  if (!result.reportText) {
    return "브리핑을 준비했지만 표시할 내용이 없습니다. 잠시 후 다시 시도해 주세요.";
  }

  return null;
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
