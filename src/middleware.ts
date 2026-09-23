import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath } from "@/lib/auth/nav";
import { sessionFromUser } from "@/lib/auth/profile";
import { parseSessionCookie } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/types";
import { getRuntimeMode } from "@/lib/config/runtime";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const aliases: Record<string, string> = {
    "/customer": "/customers",
    "/customer/": "/customers",
    "/invoice": "/invoices",
    "/invoice/": "/invoices",
    "/master": "/admin",
    "/master/": "/admin",
  };
  if (aliases[pathname]) {
    const url = request.nextUrl.clone();
    url.pathname = aliases[pathname];
    return NextResponse.redirect(url);
  }
  const mode = getRuntimeMode();
  const isLogin = pathname === "/login";

  if (mode === "empty") {
    return NextResponse.next();
  }

  if (mode === "live") {
    const { response, user, supabase } = await refreshSupabaseSession(request);
    if (!user && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (user && (isLogin || pathname === "/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (user && supabase && !isLogin) {
      const session = await sessionFromUser(supabase, user);
      if (session && !canAccessPath(session.role, pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    return response;
  }

  const session = parseSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
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
