import { isAuthorizedCronRequest } from "../../../../lib/cron-auth";
import {
  readCronRuntimeEnvironment,
  resolveRequestedBriefingSessions,
  runBriefingSession
} from "../../../../lib/briefing-cron";

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
  const briefingSessionParam = url.searchParams.get("briefingSession")?.trim();
  const runtimeEnv = readCronRuntimeEnvironment(url.origin);
  const sessions = resolveRequestedBriefingSessions({
    briefingSessionParam: briefingSessionParam ?? "both",
    timeZone: runtimeEnv.REPORT_TIMEZONE ?? "Asia/Seoul"
  });
  const results = [];

  for (const briefingSession of sessions) {
    results.push(
      await runBriefingSession({
        briefingSession,
        runtimeEnv,
        triggerType: "workflow_dispatch",
        ...(reportRunDate ? { reportRunDate } : {})
      })
    );
  }

  return Response.json({
    ok: true,
    mode: "github-actions-reconcile",
    results
  });
}
