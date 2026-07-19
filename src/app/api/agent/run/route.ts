import { NextResponse } from "next/server";
import { runReviewForCompany } from "@/lib/agent/review";
import { requireCompany } from "@/lib/tenant";

export async function POST() {
  const { company } = await requireCompany();
  const result = await runReviewForCompany(company.id);
  return NextResponse.json(result);
}
