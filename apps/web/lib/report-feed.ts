import type { PublicReport, ReportsByDate } from "../types/report";

export function groupReportsByDate(reports: PublicReport[]): ReportsByDate {
  const grouped = new Map<string, PublicReport[]>();

  for (const report of reports) {
    const items = grouped.get(report.reportDate) ?? [];
    items.push(report);
    grouped.set(report.reportDate, items);
  }

  return [...grouped.entries()].map(([reportDate, items]) => ({
    reportDate,
    reports: items.sort((left, right) =>
      left.briefingSession === right.briefingSession
        ? right.createdAt.localeCompare(left.createdAt)
        : left.briefingSession === "pre_market"
          ? -1
          : 1
    )
  }));
}

export function normalizeMarketRegime(
  marketRegime: string
): "Risk-On" | "Risk-Off" | "Neutral" {
  if (marketRegime === "Risk-On" || marketRegime === "Risk-Off") {
    return marketRegime;
  }

  return "Neutral";
}

export function scoreTone(totalScore: number): "negative" | "neutral" | "positive" {
  if (totalScore >= 0.2) {
    return "positive";
  }

  if (totalScore <= -0.2) {
    return "negative";
  }

  return "neutral";
}
