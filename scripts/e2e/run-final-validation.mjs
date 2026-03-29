import { spawn } from "node:child_process";

export const E2E_SCOPES = ["default", "db", "web", "telegram-harness", "ops"];

export function parseArgs(argv = process.argv.slice(2)) {
  const scopeArg = argv.find((value) => value.startsWith("--scope="));
  const suiteArg = argv.find((value) => value.startsWith("--suite="));
  const outputArg = argv.find((value) => value.startsWith("--output="));

  const scopes =
    scopeArg
      ?.split("=", 2)[1]
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? ["default"];

  return {
    allowProduction: argv.includes("--allow-production"),
    dryRun: argv.includes("--dry-run"),
    outputPath: outputArg?.split("=", 2)[1]?.trim(),
    scopes,
    skipLive: argv.includes("--skip-live"),
    suite: suiteArg?.split("=", 2)[1] === "full" ? "full" : "minimum"
  };
}

export function buildCommandPlan(options, env = process.env) {
  const scopes = normalizeScopes(options.scopes);
  const plan = [
    {
      label: "baseline verify",
      command: ["pnpm", "verify"]
    }
  ];

  if (requiresScope(scopes, ["db", "telegram-harness", "ops"])) {
    plan.push({
      label: "database integration tests",
      command: ["make", "test-integration"]
    });
  }

  if (requiresScope(scopes, ["web", "ops"])) {
    plan.push({
      label: "web production build",
      command: ["pnpm", "--filter", "@stock-chatbot/web", "build"]
    });
  }

  plan.push({
    label: "telegram e2e harness unit checks",
    command: [
      "pnpm",
      "test",
      "--",
      "apps/telegram-bot/src/e2e/env.test.ts",
      "apps/telegram-bot/src/e2e/webhook-driver.test.ts"
    ]
  });

  if (options.skipLive) {
    return plan;
  }

  if (requiresScope(scopes, ["ops"])) {
    if (!hasPublicWeekVerificationContext(env)) {
      throw new Error(
        "ops scope requires DATABASE_URL and PUBLIC_BRIEFING_BASE_URL so current-week public briefing coverage can be verified."
      );
    }

    plan.push({
      label: "public week coverage smoke",
      command: ["pnpm", "--filter", "@stock-chatbot/worker", "run", "run:verify-public-week"],
      env: {
        PUBLIC_BRIEFING_BASE_URL: env.PUBLIC_BRIEFING_BASE_URL,
        PUBLIC_WEEK_DATABASE_URL:
          env.PUBLIC_WEEK_DATABASE_URL?.trim() || env.DATABASE_URL?.trim()
      }
    });
  }

  if (!isLiveE2EAllowed(options, env)) {
    throw new Error(
      "Live Telegram E2E is required for final validation. Pass --allow-production or set TELEGRAM_E2E_ALLOW_PRODUCTION=1."
    );
  }

  const liveCommand = [
    "pnpm",
    "test:telegram:e2e",
    "--",
    `--suite=${options.suite}`,
    "--allow-production"
  ];

  if (options.outputPath) {
    liveCommand.push(`--output=${options.outputPath}`);
  }

  plan.push({
    label: "live telegram e2e suite",
    command: liveCommand
  });

  return plan;
}

function normalizeScopes(scopes) {
  const normalized = Array.from(
    new Set(
      (scopes.length > 0 ? scopes : ["default"]).map((scope) => scope.trim())
    )
  );

  const invalidScopes = normalized.filter((scope) => !E2E_SCOPES.includes(scope));

  if (invalidScopes.length > 0) {
    throw new Error(
      `Unsupported --scope value: ${invalidScopes.join(", ")}. Expected one of ${E2E_SCOPES.join(", ")}.`
    );
  }

  return normalized;
}

function requiresScope(scopes, requiredScopes) {
  return scopes.some((scope) => requiredScopes.includes(scope));
}

function isLiveE2EAllowed(options, env) {
  return (
    options.allowProduction ||
    env.TELEGRAM_E2E_ALLOW_PRODUCTION === "1" ||
    env.TELEGRAM_E2E_ALLOW_MUTATION === "1"
  );
}

function hasPublicWeekVerificationContext(env) {
  return Boolean(env.DATABASE_URL?.trim() && env.PUBLIC_BRIEFING_BASE_URL?.trim());
}

async function runPlan(plan) {
  for (const [index, step] of plan.entries()) {
    console.log(
      `[e2e:final] ${index + 1}/${plan.length} ${step.label}: ${step.command.join(" ")}`
    );
    await runCommand(step.command, step.env);
  }
}

function runCommand(command, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      stdio: "inherit",
      env: {
        ...process.env,
        ...(extraEnv ?? {})
      }
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Command failed: ${command.join(" ")} (code=${code ?? "null"}, signal=${signal ?? "none"})`
        )
      );
    });

    child.on("error", reject);
  });
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const plan = buildCommandPlan(options);

  if (options.dryRun) {
    for (const step of plan) {
      console.log(`[e2e:final:dry-run] ${step.label}: ${step.command.join(" ")}`);
    }
    return;
  }

  await runPlan(plan);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
