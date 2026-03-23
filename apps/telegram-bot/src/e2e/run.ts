import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { readTelegramE2EConfig } from "./env.js";
import {
  MINIMUM_REGRESSION_SCENARIO_IDS,
  TELEGRAM_E2E_SCENARIOS
} from "./scenarios.js";
import { TelegramE2ERuntime } from "./runtime.js";

type ScenarioStatus = "failed" | "passed" | "skipped";

type ScenarioRunResult = {
  durationMs: number;
  errorMessage?: string;
  id: string;
  status: ScenarioStatus;
  title: string;
};

async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const config = readTelegramE2EConfig();

  if (!config.allowProduction && !options.allowProduction) {
    throw new Error(
      "Live Telegram E2E is disabled. Set TELEGRAM_E2E_ALLOW_PRODUCTION=1 or pass --allow-production."
    );
  }

  const runtime = new TelegramE2ERuntime({
    ...config,
    allowProduction: true
  });
  const suiteStartedAt = new Date();
  const runId = `e2e-${Date.now()}`;
  const results: ScenarioRunResult[] = [];
  const configuredChatIds = [
    config.primaryChatId,
    config.secondaryChatId,
    config.groupChatId
  ].filter(Boolean) as string[];

  try {
    const scenarioIds =
      options.scenarioIds.length > 0
        ? new Set(options.scenarioIds)
        : new Set(
            options.suite === "minimum"
              ? MINIMUM_REGRESSION_SCENARIO_IDS
              : TELEGRAM_E2E_SCENARIOS.map((scenario) => scenario.id)
          );

    for (const scenario of TELEGRAM_E2E_SCENARIOS) {
      if (!scenarioIds.has(scenario.id)) {
        continue;
      }

      const start = Date.now();
      const missingRequirements = getMissingRequirements(scenario.requirements, config);

      if (missingRequirements.length > 0) {
        results.push({
          id: scenario.id,
          title: scenario.title,
          status: "skipped",
          durationMs: Date.now() - start,
          errorMessage: `Missing env: ${missingRequirements.join(", ")}`
        });
        continue;
      }

      try {
        await scenario.run({
          runId,
          runtime,
          suiteStartedAt
        });
        results.push({
          id: scenario.id,
          title: scenario.title,
          status: "passed",
          durationMs: Date.now() - start
        });
      } catch (error) {
        results.push({
          id: scenario.id,
          title: scenario.title,
          status: "failed",
          durationMs: Date.now() - start,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    }
  } finally {
    if (config.cleanupAfterRun) {
      await runtime.resetUser(config.primaryUserId);

      if (config.secondaryUserId) {
        await runtime.resetUser(config.secondaryUserId);
      }

      await runtime.cleanupSuiteArtifacts({
        chatIds: configuredChatIds,
        telegramUserIds: [
          config.primaryUserId,
          config.secondaryUserId
        ].filter(Boolean) as string[],
        since: suiteStartedAt
      });
    }

    await runtime.close();
  }

  if (options.outputPath) {
    await mkdir(dirname(options.outputPath), {
      recursive: true
    });
    await writeFile(
      options.outputPath,
      JSON.stringify(
        {
          runId,
          suite: options.suite,
          results
        },
        null,
        2
      ),
      "utf8"
    );
  }

  printResults(results);

  if (results.some((result) => result.status === "failed")) {
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]) {
  const suiteArg = argv.find((value) => value.startsWith("--suite="));
  const scenarioArg = argv.find((value) => value.startsWith("--scenario="));
  const outputArg = argv.find((value) => value.startsWith("--output="));

  return {
    allowProduction: argv.includes("--allow-production"),
    outputPath: outputArg ? resolve(outputArg.split("=", 2)[1] ?? "") : undefined,
    scenarioIds:
      scenarioArg
        ?.split("=", 2)[1]
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? [],
    suite: suiteArg?.split("=", 2)[1] === "full" ? "full" : "minimum"
  } as const;
}

function getMissingRequirements(
  requirements: readonly string[],
  config: ReturnType<typeof readTelegramE2EConfig>
): string[] {
  const missing: string[] = [];

  for (const requirement of requirements) {
    switch (requirement) {
      case "primary_user":
        if (!config.primaryChatId || !config.primaryUserId) {
          missing.push("primary_user");
        }
        break;
      case "secondary_user":
        if (!config.secondaryChatId || !config.secondaryUserId) {
          missing.push("secondary_user");
        }
        break;
      case "group_chat":
        if (!config.groupChatId) {
          missing.push("group_chat");
        }
        break;
    }
  }

  return missing;
}

function printResults(results: ScenarioRunResult[]): void {
  const counts = results.reduce(
    (acc, result) => {
      acc[result.status] += 1;
      return acc;
    },
    {
      passed: 0,
      failed: 0,
      skipped: 0
    }
  );

  console.log(
    `[telegram-e2e] passed=${counts.passed} failed=${counts.failed} skipped=${counts.skipped}`
  );

  for (const result of results) {
    const summary = [
      `[${result.status.toUpperCase()}]`,
      result.id,
      `(${result.durationMs}ms)`
    ].join(" ");

    if (result.errorMessage) {
      console.log(`${summary} - ${result.errorMessage}`);
      continue;
    }

    console.log(summary);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
