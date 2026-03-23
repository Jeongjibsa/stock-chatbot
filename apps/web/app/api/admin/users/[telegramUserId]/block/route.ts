import { NextResponse } from "next/server";

import {
  buildAdminUserActionRedirectUrl,
  isProtectedAdminUser
} from "../../../../../../lib/admin-user-actions";
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

  if (isProtectedAdminUser(telegramUserId)) {
    return NextResponse.redirect(
      buildAdminUserActionRedirectUrl({
        action: "error_admin_protected",
        requestUrl: request.url,
        telegramUserId
      }),
      303
    );
  }

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
    return NextResponse.redirect(
      buildAdminUserActionRedirectUrl({
        action: "error_not_found",
        requestUrl: request.url,
        telegramUserId
      }),
      303
    );
  }

  return NextResponse.redirect(
    buildAdminUserActionRedirectUrl({
      action: "blocked",
      requestUrl: request.url,
      telegramUserId
    }),
    303
  );
}
