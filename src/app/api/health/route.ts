import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.researcher.count();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
}
