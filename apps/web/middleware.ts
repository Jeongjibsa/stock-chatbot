import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthorizedAdminRequest } from "./lib/admin-auth";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!isAuthorizedAdminRequest(request.headers)) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: {
          "www-authenticate": 'Basic realm="Stock Briefing Admin"'
        }
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};
