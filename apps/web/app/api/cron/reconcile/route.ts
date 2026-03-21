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

  const url = new URL(request.url);
  const reportRunDate = url.searchParams.get("reportRunDate")?.trim();
  const summary = await runDailyReport({
    ...process.env,
    REPORT_RUN_DATE: reportRunDate,
    REPORT_TRIGGER_TYPE: "workflow_dispatch"
  });

  return Response.json({
    ok: true,
    mode: "github-actions-reconcile",
    summary
  });
}
