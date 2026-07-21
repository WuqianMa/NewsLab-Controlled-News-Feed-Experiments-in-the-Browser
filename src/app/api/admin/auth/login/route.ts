import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/schemas";
import { signAdminToken, adminCookieOptions } from "@/lib/auth";
import { ADMIN_COOKIE } from "@/lib/constants";

// 5 attempts/min per email — in-memory, prototype-grade.
const attempts = new Map<string, { count: number; windowStart: number }>();

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  const now = Date.now();
  const bucket = attempts.get(email);
  if (bucket && now - bucket.windowStart < 60_000 && bucket.count >= 5) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!bucket || now - bucket.windowStart >= 60_000) {
    attempts.set(email, { count: 1, windowStart: now });
  } else {
    bucket.count++;
  }

  const researcher = await prisma.researcher.findUnique({ where: { email } });
  const ok =
    researcher && (await bcrypt.compare(parsed.data.password, researcher.passwordHash));
  if (!ok) {
    // Same message for unknown email and wrong password — no enumeration.
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await signAdminToken(researcher.id), adminCookieOptions);
  return res;
}
