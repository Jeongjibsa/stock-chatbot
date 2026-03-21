import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPublicDailyBriefing,
  buildQuantScorecards,
  CompositeMarketDataAdapter,
  DailyReportCompositionService,
  FredMarketDataAdapter,
  GOOGLE_PROVIDER_PROFILE,
  createLlmClient,
  OPENAI_PROVIDER_PROFILE,
  toQuantStrategyBullets,
  YahooFinanceScrapingMarketDataAdapter,
  type DailyReportComposition,
  type MarketDataAdapter,
  type MarketDataFetchResult
} from "@stock-chatbot/application";
import { DEFAULT_MARKET_WATCH_CATALOG } from "@stock-chatbot/database";

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
    composition = await dependencies.reportCompositionService.compose({
      holdings: [],
      marketResults,
      newsBriefs: [],
      quantScorecards,
      quantScenarios,
      riskCheckpoints: [],
      runDate: dependencies.runDate
    });
  }

  return buildPublicDailyBriefing({
    runDate: dependencies.runDate,
    summaryLine:
      composition?.oneLineSummary ??
      buildFallbackSummaryLine(marketResults),
    marketResults,
    keyIndicatorBullets: buildKeyIndicatorBullets(marketResults),
    marketBullets: composition?.marketBullets ?? [],
    macroBullets: composition?.macroBullets ?? [],
    fundFlowBullets: composition?.fundFlowBullets ?? [],
    eventBullets: composition?.eventBullets ?? [],
    riskBullets: composition?.riskBullets ?? []
  });
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

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(briefing, null, 2)}\n`);

  return {
    runDate,
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

function buildFallbackSummaryLine(results: MarketDataFetchResult[]): string {
  const marketMap = new Map(
    results.flatMap((result) =>
      result.status === "ok" ? [[result.data.itemCode, result.data]] : []
    )
  );
  const nasdaqChange = marketMap.get("NASDAQ")?.changePercent ?? 0;
  const vixChange = marketMap.get("VIX")?.changePercent ?? 0;
  const dxyChange = marketMap.get("DXY")?.changePercent ?? 0;

  if (nasdaqChange <= -1.5 && vixChange >= 5) {
    return "미국 성장주 약세와 변동성 확대가 겹쳐 있어 신규 매수는 보수적으로 접근하시는 편이 좋습니다.";
  }

  if (dxyChange >= 0.5) {
    return "달러 강세 압력이 이어지고 있어 환율 부담을 확인하며 방어적으로 대응하시는 편이 좋습니다.";
  }

  return "최근 가용 시장 지표 기준으로 핵심 대응 포인트를 정리했습니다.";
}

function buildKeyIndicatorBullets(results: MarketDataFetchResult[]): string[] {
  const marketMap = new Map(
    results.flatMap((result) =>
      result.status === "ok" ? [[result.data.itemCode, result.data]] : []
    )
  );
  const bullets: string[] = [];

  if ((marketMap.get("VIX")?.changePercent ?? 0) >= 5) {
    bullets.push("VIX 급등으로 변동성 경계가 강화됐습니다.");
  }

  if ((marketMap.get("NASDAQ")?.changePercent ?? 0) <= -1.5) {
    bullets.push("NASDAQ 약세가 커지며 성장주 변동성이 확대됐습니다.");
  }

  if ((marketMap.get("COPPER")?.changePercent ?? 0) >= 5) {
    bullets.push("구리 강세가 이어져 산업 수요 기대는 완전히 꺾이지 않았습니다.");
  }

  if (
    (marketMap.get("USD_KRW")?.changePercent ?? 0) >= 0.3 &&
    (marketMap.get("DXY")?.changePercent ?? 0) >= 0.3
  ) {
    bullets.push("달러 강세와 원화 약세가 함께 나타나 환율 부담을 점검하시는 편이 좋습니다.");
  }

  return bullets.slice(0, 4);
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
