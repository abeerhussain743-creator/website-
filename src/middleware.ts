import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  decodeSession,
  onboardingCompleteFromToken,
} from "@/lib/auth-shared";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = decodeSession(token);
  const authed = Boolean(session);

  if (pathname.startsWith("/app") && !authed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/onboarding") && !authed) {
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  if (pathname.startsWith("/app") && authed && !onboardingCompleteFromToken(token)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if ((pathname === "/login" || pathname === "/signup") && authed) {
    const dest = onboardingCompleteFromToken(token) ? "/app" : "/onboarding";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (pathname === "/onboarding" && authed && onboardingCompleteFromToken(token)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup", "/onboarding", "/onboarding/:path*"],
};
