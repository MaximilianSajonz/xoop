import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/whoop";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });
  try {
    await exchangeCode(code);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
  return NextResponse.redirect(new URL("/?connected=1", req.url));
}
