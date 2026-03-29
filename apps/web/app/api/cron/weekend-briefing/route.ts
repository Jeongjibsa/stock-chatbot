import { isAuthorizedCronRequest } from "../../../../lib/cron-auth";
import {
  readCronRuntimeEnvironment,
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

  const runtimeEnv = readCronRuntimeEnvironment(new URL(request.url).origin);
  const result = await runBriefingSession({
    briefingSession: "weekend_briefing",
    runtimeEnv,
    triggerType: "schedule"
  });

  return Response.json({
    ok: true,
    mode: "vercel-cron-weekend",
    result
  });
}
