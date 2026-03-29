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
  briefingSession: "post_market" | "pre_market" | "weekend_briefing";
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

export type AdminStrategyBacktestSummary = {
  averageReturnPct: number | null;
  evaluatedCount: number;
  hitRate: number | null;
  lossCount: number;
  neutralCount: number;
  unavailableCount: number;
  winCount: number;
};

export type AdminRecentStrategySnapshot = {
  action: "ACCUMULATE" | "DEFENSIVE" | "HOLD" | "REDUCE";
  companyName: string;
  createdAt: string;
  displayName: string;
  exchange: string | null;
  id: string;
  outcome: "loss" | "neutral" | "unavailable" | "win";
  realizedReturnPct: number | null;
  runDate: string;
  symbol: string | null;
  totalScore: number;
};

export type AdminDashboardSnapshot = {
  latestReport: AdminRecentPublicReport | null;
  recentReports: AdminRecentPublicReport[];
  recentRuns: AdminRecentRun[];
  recentStrategySnapshots: AdminRecentStrategySnapshot[];
  users: AdminUserSummary[];
  reportsLast7Days: number;
  runSummary24h: AdminDashboardSummary;
  strategyBacktestSummary: AdminStrategyBacktestSummary;
};

export type AdminUserSummary = {
  blockedAt: string | null;
  blockedReason: "flood" | "manual" | null;
  dailyPortfolioRequestsToday: number;
  dailyReportRequestsToday: number;
  displayName: string;
  isBlocked: boolean;
  isRegistered: boolean;
  lastRequestAt: string | null;
  telegramUserId: string;
  unregisteredAt: string | null;
};
