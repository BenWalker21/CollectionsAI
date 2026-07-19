import { NextResponse } from "next/server";
import { confirmMatchCandidate, rejectMatchCandidate } from "@/lib/matching/service";
import { requireCompany } from "@/lib/tenant";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { company } = await requireCompany();
  const { id } = await params;
  const { action } = await request.json();

  try {
    if (action === "confirm") {
      const result = await confirmMatchCandidate(company.id, id);
      return NextResponse.json(result);
    }
    if (action === "reject") {
      const result = await rejectMatchCandidate(company.id, id);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "action must be 'confirm' or 'reject'" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
