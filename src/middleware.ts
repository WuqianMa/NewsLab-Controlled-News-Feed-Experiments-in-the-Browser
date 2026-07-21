import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ADMIN_COOKIE } from "@/lib/constants";
import { isBlockedDemoAdminMutation } from "@/lib/demoMode";
import { getAppSecret } from "@/lib/env";

const PUBLIC = ["/admin/login", "/api/admin/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  let ok = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(getAppSecret())
      );
      ok = payload.purpose === "admin" && !!payload.sub;
    } catch {
      ok = false;
    }
  }
  if (ok) {
    if (isBlockedDemoAdminMutation(pathname, req.method)) {
      return NextResponse.json(
        {
          error: "demo_read_only",
          message: "Admin changes are disabled in the public demo.",
        },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
