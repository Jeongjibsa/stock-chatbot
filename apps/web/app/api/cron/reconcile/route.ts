import { runDailyReport } from "@stock-chatbot/worker/run-daily-report";
import { isAuthorizedCronRequest } from "../../../../lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readCronRuntimeEnvironment() {
  return {
    CRON_SECRET: process.env.CRON_SECRET,
    DAILY_REPORT_WINDOW_MINUTES: process.env.DAILY_REPORT_WINDOW_MINUTES,
    DATABASE_URL: process.env.DATABASE_URL,
    FRED_API_KEY: process.env.FRED_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PUBLIC_BRIEFING_BASE_URL: process.env.PUBLIC_BRIEFING_BASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    REPORT_TIMEZONE: process.env.REPORT_TIMEZONE,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN
  };
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", {
      status: 401
    });
  }

  const url = new URL(request.url);
  const reportRunDate = url.searchParams.get("reportRunDate")?.trim();
  const summary = await runDailyReport({
    ...readCronRuntimeEnvironment(),
    REPORT_RUN_DATE: reportRunDate,
    REPORT_TRIGGER_TYPE: "workflow_dispatch"
  });

  return Response.json({
    ok: true,
    mode: "github-actions-reconcile",
    summary
  });
}
