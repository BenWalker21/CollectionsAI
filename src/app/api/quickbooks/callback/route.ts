import { NextResponse, type NextRequest } from "next/server";
import { fetchCompanyName } from "@/lib/quickbooks/client";
import { exchangeCodeForTokens, storeConnection } from "@/lib/quickbooks/tokens";
import { requireCompany } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("qb_oauth_state")?.value;

  const failUrl = new URL("/?qb_error=1", request.url);
  if (!code || !realmId || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(failUrl);
  }

  let companyId: string;
  try {
    ({ company: { id: companyId } } = await requireCompany());
  } catch {
    return NextResponse.redirect(failUrl);
  }

  const tokens = await exchangeCodeForTokens(code);
  const companyName = await fetchCompanyName(tokens.access_token, realmId).catch(() => undefined);
  await storeConnection(companyId, realmId, tokens, companyName);

  const response = NextResponse.redirect(new URL("/?qb_connected=1", request.url));
  response.cookies.delete("qb_oauth_state");
  return response;
}
