import "dotenv/config";

import { fileURLToPath } from "node:url";

import {
  buildDailyReportJobProcessor,
  readRunDate,
  type DailyReportJobSummary
} from "./process-daily-report.js";

type Environment = Record<string, string | undefined>;

export type ReportTriggerType = "manual" | "schedule" | "workflow_dispatch";

export function readReportTriggerType(
  env: Environment = process.env
): ReportTriggerType {
  const triggerType = env.REPORT_TRIGGER_TYPE;

  if (
    triggerType === "schedule" ||
    triggerType === "workflow_dispatch" ||
    triggerType === "manual"
  ) {
    return triggerType;
  }

  return "manual";
}

export function formatDailyReportJobSummary(input: {
  runDate: string;
  summary: DailyReportJobSummary;
  triggerType: ReportTriggerType;
}): string {
  return [
    `[daily-report] trigger=${input.triggerType}`,
    `runDate=${input.runDate}`,
    `users=${input.summary.userCount}`,
    `completed=${input.summary.completedCount}`,
    `delivered=${input.summary.deliveredCount}`,
    `deliverySkipped=${input.summary.deliverySkippedCount}`,
    `deliveryFailed=${input.summary.deliveryFailedCount}`,
    `partialSuccess=${input.summary.partialSuccessCount}`,
    `failed=${input.summary.failedCount}`,
    `skippedDuplicate=${input.summary.skippedDuplicateCount}`
  ].join(" ");
}

export async function runDailyReport(env: Environment = process.env): Promise<DailyReportJobSummary> {
  const run = buildDailyReportJobProcessor(env);

  return run();
}

async function main(): Promise<void> {
  const triggerType = readReportTriggerType();
  const runDate = readRunDate();
  const summary = await runDailyReport();

  console.log(
    formatDailyReportJobSummary({
      triggerType,
      runDate,
      summary
    })
  );
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
