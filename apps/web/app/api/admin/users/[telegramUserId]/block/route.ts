import { NextResponse } from "next/server";

import { getWebPool } from "../../../../../../lib/db";
import { isAuthorizedAdminRequest } from "../../../../../../lib/admin-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ telegramUserId: string }> }
) {
  if (!isAuthorizedAdminRequest(new Headers(request.headers))) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "www-authenticate": 'Basic realm="Stock Briefing Admin"'
      }
    });
  }

  const { telegramUserId } = await context.params;
  const pool = getWebPool();
  const result = await pool.query(
    [
      'UPDATE "users"',
      'SET "is_blocked" = TRUE,',
      `"blocked_reason" = 'manual',`,
      '"blocked_at" = NOW(),',
      '"updated_at" = NOW()',
      'WHERE "telegram_user_id" = $1',
      'RETURNING "telegram_user_id"'
    ].join(" "),
    [telegramUserId]
  );

  if (result.rowCount === 0) {
    return new NextResponse("Not Found", {
      status: 404
    });
  }

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
