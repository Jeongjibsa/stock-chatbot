import { describe, expect, it } from "vitest";

import {
  buildCommandPlan,
  parseArgs
} from "./run-final-validation.mjs";

describe("parseArgs", () => {
  it("parses scope, suite, output, and allow-production flags", () => {
    const options = parseArgs([
      "--scope=web,db",
      "--suite=full",
      "--allow-production",
      "--output=/tmp/e2e.json"
    ]);

    expect(options).toEqual({
      allowProduction: true,
      dryRun: false,
      outputPath: "/tmp/e2e.json",
      scopes: ["web", "db"],
      skipLive: false,
      suite: "full"
    });
  });

  it("defaults to minimum suite and default scope", () => {
    const options = parseArgs([]);

    expect(options.scopes).toEqual(["default"]);
    expect(options.suite).toBe("minimum");
    expect(options.skipLive).toBe(false);
  });
});

describe("buildCommandPlan", () => {
  it("builds the default final validation flow", () => {
    const plan = buildCommandPlan(
      {
        allowProduction: true,
        dryRun: false,
        outputPath: undefined,
        scopes: ["default"],
        skipLive: false,
        suite: "minimum"
      },
      {}
    );

    expect(plan.map((step) => step.label)).toEqual([
      "baseline verify",
      "telegram e2e harness unit checks",
      "live telegram e2e suite"
    ]);
    expect(plan.at(-1)?.command).toEqual([
      "pnpm",
      "test:telegram:e2e",
      "--",
      "--suite=minimum",
      "--allow-production"
    ]);
  });

  it("adds db and web specific validation steps for matching scopes", () => {
    const plan = buildCommandPlan(
      {
        allowProduction: true,
        dryRun: false,
        outputPath: "/tmp/out.json",
        scopes: ["db", "web", "ops"],
        skipLive: false,
        suite: "full"
      },
      {
        DATABASE_URL: "postgresql://example",
        PUBLIC_BRIEFING_BASE_URL: "https://example.com"
      }
    );

    expect(plan.map((step) => step.label)).toEqual([
      "baseline verify",
      "database integration tests",
      "web production build",
      "telegram e2e harness unit checks",
      "public briefing retention smoke",
      "live telegram e2e suite"
    ]);
    expect(plan.find((step) => step.label === "public briefing retention smoke")?.env)
      .toEqual({
        PUBLIC_BRIEFING_BASE_URL: "https://example.com",
        PUBLIC_WEEK_DATABASE_URL: "postgresql://example"
      });
    expect(plan.at(-1)?.command).toEqual([
      "pnpm",
      "test:telegram:e2e",
      "--",
      "--suite=full",
      "--allow-production",
      "--output=/tmp/out.json"
    ]);
  });

  it("allows local-only workflow when skip-live is set", () => {
    const plan = buildCommandPlan(
      {
        allowProduction: false,
        dryRun: false,
        outputPath: undefined,
        scopes: ["telegram-harness"],
        skipLive: true,
        suite: "minimum"
      },
      {}
    );

    expect(plan.map((step) => step.label)).toEqual([
      "baseline verify",
      "database integration tests",
      "telegram e2e harness unit checks"
    ]);
  });

  it("fails when live e2e is required without production allowance", () => {
    expect(() =>
      buildCommandPlan(
        {
          allowProduction: false,
          dryRun: false,
          outputPath: undefined,
          scopes: ["default"],
          skipLive: false,
          suite: "minimum"
        },
        {}
      )
    ).toThrow(/Live Telegram E2E is required/);
  });

  it("fails for ops scope when public week verification context is missing", () => {
    expect(() =>
      buildCommandPlan(
        {
          allowProduction: true,
          dryRun: false,
          outputPath: undefined,
          scopes: ["ops"],
          skipLive: false,
          suite: "minimum"
        },
        {}
      )
    ).toThrow(/ops scope requires DATABASE_URL and PUBLIC_BRIEFING_BASE_URL/);
  });

  it("accepts env-based live e2e allowance", () => {
    const plan = buildCommandPlan(
      {
        allowProduction: false,
        dryRun: false,
        outputPath: undefined,
        scopes: ["default"],
        skipLive: false,
        suite: "minimum"
      },
      {
        TELEGRAM_E2E_ALLOW_PRODUCTION: "1"
      }
    );

    expect(plan.at(-1)?.label).toBe("live telegram e2e suite");
  });
});
