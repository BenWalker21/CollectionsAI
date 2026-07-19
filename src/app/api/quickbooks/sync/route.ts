import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/quickbooks/tokens";
import { syncInvoicesForCompany } from "@/lib/quickbooks/sync";
import { requireCompany } from "@/lib/tenant";

export async function POST(request: Request) {
  const { company } = await requireCompany();

  const token = await getValidAccessToken(company.id);
  if (!token) {
    return NextResponse.json({ error: "QuickBooks is not connected" }, { status: 400 });
  }

  const result = await syncInvoicesForCompany(company.id, token.accessToken, token.realmId);

  const wantsRedirect = request.headers.get("accept")?.includes("text/html");
  if (wantsRedirect) {
    return NextResponse.redirect(new URL("/?qb_synced=1", request.url));
  }
  return NextResponse.json(result);
}
