import { revalidatePath } from "next/cache";
import { runPublicBriefing } from "@stock-chatbot/worker/run-public-briefing";

import { isAuthorizedCronRequest } from "../../../../lib/cron-auth";
import { readCronRuntimeEnvironment } from "../../../../lib/briefing-cron";
import { getWebPool } from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", {
      status: 401
    });
  }

  const url = new URL(request.url);
  const briefingSession = url.searchParams.get("briefingSession")?.trim();
  const reportRunDate = url.searchParams.get("reportRunDate")?.trim();

  if (!briefingSession || !reportRunDate) {
    return Response.json(
      {
        ok: false,
        error: "briefingSession and reportRunDate are required"
      },
      {
        status: 400
      }
    );
  }

  const runtimeEnv = readCronRuntimeEnvironment(url.origin);
  const result = await runPublicBriefing({
    ...runtimeEnv,
    BRIEFING_SESSION: briefingSession,
    DISABLE_UPSTASH_NEWS_CACHE: "true",
    REPORT_RUN_DATE: reportRunDate,
    REPORT_TRIGGER_TYPE: "workflow_dispatch"
  });

  revalidatePath("/");

  let readPathVerified = false;

  if (result.persistedReportId) {
    const pool = getWebPool();
    const verification = await pool.query<{ id: string }>(
      [
        'SELECT "id"',
        'FROM "reports"',
        'WHERE "id" = $1',
        'LIMIT 1'
      ].join(" "),
      [result.persistedReportId]
    );

    if (!verification.rows[0]) {
      return Response.json(
        {
          ok: false,
          error: "public_read_path_verification_failed",
          result
        },
        {
          status: 500
        }
      );
    }

    readPathVerified = true;
    revalidatePath(`/reports/${result.persistedReportId}`);
  }

  return Response.json({
    ok: true,
    mode: "vercel-cron-public-backfill",
    readPathVerified,
    result
  });
}
