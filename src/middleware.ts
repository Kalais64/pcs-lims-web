import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath } from "@/lib/auth/nav";
import { parseSessionCookie } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/types";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = parseSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = pathname === "/login";

  if (!session && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && (isLogin || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && !canAccessPath(session.role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
