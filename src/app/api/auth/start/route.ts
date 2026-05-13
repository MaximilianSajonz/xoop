import { NextResponse } from "next/server";
import { SCOPES } from "@/lib/whoop";

export async function GET() {
  const url = new URL("https://api.prod.whoop.com/oauth/oauth2/auth");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.WHOOP_CLIENT_ID!);
  url.searchParams.set("redirect_uri", process.env.WHOOP_REDIRECT_URI!);
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", crypto.randomUUID());
  return NextResponse.redirect(url.toString());
}
