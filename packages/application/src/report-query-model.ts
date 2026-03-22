export type ReportHistoryItem = {
  completedAt?: string | null;
  id: string;
  promptVersion?: string | null;
  runDate: string;
  scheduleType: string;
  skillVersion?: string | null;
  status: string;
  summaryLine: string;
};

export type LatestReportView = {
  historyItem: ReportHistoryItem;
  renderedText: string;
};

type ReportRunReadModel = {
  completedAt?: Date | null | string;
  id: string;
  promptVersion?: string | null;
  reportText?: string | null;
  runDate: Date | string;
  scheduleType: string;
  skillVersion?: string | null;
  status: string;
};

export function toReportHistoryItem(
  reportRun: ReportRunReadModel
): ReportHistoryItem {
  const renderedText = reportRun.reportText ?? "";
  const summaryLine = extractSummaryLine(renderedText);
  const historyItem: ReportHistoryItem = {
    id: reportRun.id,
    promptVersion: reportRun.promptVersion ?? null,
    runDate: serializeDate(reportRun.runDate),
    scheduleType: reportRun.scheduleType,
    skillVersion: reportRun.skillVersion ?? null,
    status: reportRun.status,
    summaryLine
  };
  const completedAt = serializeDateTime(reportRun.completedAt);

  if (completedAt !== undefined) {
    historyItem.completedAt = completedAt;
  }

  return historyItem;
}

function extractSummaryLine(renderedText: string): string {
  const lines = renderedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const titledIndex = lines.findIndex((line) => line === "2. 📌 오늘 한 줄 결론");

  if (titledIndex >= 0) {
    const nextLine = lines[titledIndex + 1];

    if (nextLine) {
      return nextLine.replace(/^-+\s*/, "");
    }
  }

  return lines[1] ?? "";
}

export function toLatestReportView(
  reportRun: ReportRunReadModel
): LatestReportView {
  return {
    historyItem: toReportHistoryItem(reportRun),
    renderedText: reportRun.reportText ?? ""
  };
}

function serializeDate(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function serializeDateTime(value?: Date | null | string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
}
