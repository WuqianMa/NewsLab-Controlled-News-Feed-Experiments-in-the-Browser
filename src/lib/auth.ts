import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE } from "./constants";
import { getAppSecret } from "./env";

const secret = () =>
  new TextEncoder().encode(getAppSecret());

export async function signAdminToken(researcherId: string): Promise<string> {
  return new SignJWT({ purpose: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(researcherId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyAdminToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "admin" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function getAdmin(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 3600,
};

// Preview tokens (fable/06 §2): short-lived, force a specific condition,
// flag the participant as is_preview so their data never pollutes exports.
export async function signPreviewToken(
  experimentId: string,
  conditionId: string
): Promise<string> {
  return new SignJWT({ purpose: "preview", experimentId, conditionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret());
}

export async function verifyPreviewToken(
  token: string
): Promise<{ experimentId: string; conditionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "preview") return null;
    return {
      experimentId: String(payload.experimentId),
      conditionId: String(payload.conditionId),
    };
  } catch {
    return null;
  }
}
