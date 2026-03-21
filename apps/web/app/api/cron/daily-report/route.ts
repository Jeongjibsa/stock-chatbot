import { runDailyReport } from "@stock-chatbot/worker/run-daily-report";
import { isAuthorizedCronRequest } from "../../../../lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", {
      status: 401
    });
  }

  const summary = await runDailyReport({
    ...process.env,
    REPORT_TRIGGER_TYPE: "schedule"
  });

  return Response.json({
    ok: true,
    mode: "vercel-cron-primary",
    summary
  });
}
