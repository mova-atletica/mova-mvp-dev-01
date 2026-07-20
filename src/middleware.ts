import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const PHASE_B_ENABLED = process.env.NEXT_PUBLIC_PHASE_B_ENABLED === "true";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Phase A: hide partner surfaces from the public app.
  if (!PHASE_B_ENABLED && (pathname === "/partner" || pathname.startsWith("/partner/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Skip database-dependent API routes during build time
  const isBuildTime = process.env.NODE_ENV === "production" && !process.env.DATABASE_URL;

  if (isBuildTime && pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/storage/")) {
      return NextResponse.next();
    }

    const blockedRoutes = [
      "/api/exercises",
      "/api/analysis",
      "/api/featured-content",
      "/api/curated-sections",
    ];

    const isBlocked = blockedRoutes.some((route) => pathname.startsWith(route));

    if (isBlocked) {
      return NextResponse.json(
        {
          error: "API not available during build",
          message: "This endpoint requires database access",
        },
        { status: 503 }
      );
    }
  }

  // Refresh Supabase auth cookies on matched routes.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/partner/:path*",
    "/api/:path*",
    "/account/:path*",
    "/login",
    "/auth/:path*",
    "/open-move-v2/:path*",
    "/coach-studio/:path*",
    "/",
  ],
};
