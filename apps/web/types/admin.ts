export type AdminRecentRun = {
  completedAt: string | null;
  displayName: string;
  errorMessage: string | null;
  id: string;
  runDate: string;
  scheduleType: string;
  startedAt: string;
  status: "completed" | "failed" | "partial_success" | "running";
};

export type AdminRecentPublicReport = {
  createdAt: string;
  id: string;
  marketRegime: string;
  reportDate: string;
  summary: string;
  totalScore: number;
};

export type AdminDashboardSummary = {
  completedCount: number;
  failedCount: number;
  partialSuccessCount: number;
  runningCount: number;
  totalCount: number;
};

export type AdminDashboardSnapshot = {
  latestReport: AdminRecentPublicReport | null;
  recentReports: AdminRecentPublicReport[];
  recentRuns: AdminRecentRun[];
  reportsLast7Days: number;
  runSummary24h: AdminDashboardSummary;
};
