import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { QB_AUTHORIZE_URL, QB_SCOPE, qbClientId, qbRedirectUri } from "@/lib/quickbooks/config";

export async function GET() {
  const state = randomUUID();

  const url = new URL(QB_AUTHORIZE_URL);
  url.searchParams.set("client_id", qbClientId());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", QB_SCOPE);
  url.searchParams.set("redirect_uri", qbRedirectUri());
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  response.cookies.set("qb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
