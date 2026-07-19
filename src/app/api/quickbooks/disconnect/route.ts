import { NextResponse } from "next/server";
import { deleteConnection } from "@/lib/quickbooks/tokens";
import { requireCompany } from "@/lib/tenant";

export async function POST() {
  const { company } = await requireCompany();
  await deleteConnection(company.id);
  return NextResponse.json({ ok: true });
}
