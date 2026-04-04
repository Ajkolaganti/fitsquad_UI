import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Same-origin `/api-proxy/*` is rewritten to the real API. A GET to
 * `/api-proxy/auth/register` (e.g. opening the URL in a browser) becomes GET
 * `/auth/register` on the server, which has no route — only POST exists.
 * Intercept those GET/HEAD requests and return 405 with a clear hint.
 */
export function middleware(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  return NextResponse.json(
    {
      success: false,
      message:
        "Auth routes accept POST only (JSON). Opening this URL in the browser sends GET. Use POST to /auth/register on your API with Content-Type: application/json and body { \"name\", \"email\", \"password\" }.",
    },
    { status: 405 }
  );
}

export const config = {
  matcher: ["/api-proxy/auth/:path*"],
};
