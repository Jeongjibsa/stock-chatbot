import {
  isScheduledBriefingSessionAllowed,
  type BriefingSession,
  parseBriefingSession,
  resolveScheduledBriefingSession
} from "@stock-chatbot/application";
import { runDailyReport } from "@stock-chatbot/worker/run-daily-report";
import { runPublicBriefing } from "@stock-chatbot/worker/run-public-briefing";

type TriggerType = "schedule" | "workflow_dispatch";

export function readCronRuntimeEnvironment(publicBriefingBaseUrl: string) {
  return {
    CRON_SECRET: process.env.CRON_SECRET,
    DAILY_REPORT_WINDOW_MINUTES: process.env.DAILY_REPORT_WINDOW_MINUTES,
    DATABASE_URL: process.env.DATABASE_URL,
    FRED_API_KEY: process.env.FRED_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PUBLIC_BRIEFING_BASE_URL:
      process.env.PUBLIC_BRIEFING_BASE_URL || publicBriefingBaseUrl,
    REDIS_URL: process.env.REDIS_URL,
    REPORT_TIMEZONE: process.env.REPORT_TIMEZONE,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN
  };
}

export async function runBriefingSession(input: {
  briefingSession: BriefingSession;
  reportRunDate?: string | null;
  runtimeEnv: ReturnType<typeof readCronRuntimeEnvironment>;
  triggerType: TriggerType;
}) {
  if (
    input.triggerType === "schedule" &&
    !isScheduledBriefingSessionAllowed(input.briefingSession, {
      timeZone: input.runtimeEnv.REPORT_TIMEZONE ?? "Asia/Seoul"
    })
  ) {
    return {
      skipped: true,
      briefingSession: input.briefingSession,
      reason: "session_not_allowed_for_today"
    };
  }

  const env = {
    ...input.runtimeEnv,
    BRIEFING_SESSION: input.briefingSession,
    REPORT_TRIGGER_TYPE: input.triggerType,
    REPORT_RUN_DATE: input.reportRunDate?.trim() || undefined
  };

  const summary = await runDailyReport(env);
  const publicBriefing = await runPublicBriefing(env);

  return {
    skipped: false,
    briefingSession: input.briefingSession,
    summary,
    publicBriefing
  };
}

export function resolveRequestedBriefingSessions(input: {
  briefingSessionParam?: string | null;
  now?: Date;
  timeZone?: string;
}): BriefingSession[] {
  const parsed = parseBriefingSession(input.briefingSessionParam);

  if (parsed) {
    return [parsed];
  }

  if (input.briefingSessionParam === "both") {
    return ["pre_market", "post_market"];
  }

  const resolved = resolveScheduledBriefingSession({
    timeZone: input.timeZone ?? "Asia/Seoul",
    ...(input.now ? { now: input.now } : {})
  });

  return resolved === "none" ? [] : [resolved];
}
