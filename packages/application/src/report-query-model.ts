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
  const historyItem: ReportHistoryItem = {
    id: reportRun.id,
    promptVersion: reportRun.promptVersion ?? null,
    runDate: serializeDate(reportRun.runDate),
    scheduleType: reportRun.scheduleType,
    skillVersion: reportRun.skillVersion ?? null,
    status: reportRun.status,
    summaryLine: renderedText.split("\n")[1] ?? ""
  };
  const completedAt = serializeDateTime(reportRun.completedAt);

  if (completedAt !== undefined) {
    historyItem.completedAt = completedAt;
  }

  return historyItem;
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
