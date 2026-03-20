export const REPORT_QUEUE_NAME = "daily-report";
export const DAILY_REPORT_JOB_NAME = "daily-report.run";

export type DailyReportPayload = {
  source: "bootstrap" | "scheduler" | "manual";
};

export {
  StaticInstrumentResolver,
  type MarketIndicatorResolution,
  type PortfolioTickerResolution,
  type SupportedExchange
} from "./resolution.js";
