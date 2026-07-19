import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/tenant";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { company, userId } = await requireCompany();
  const { id } = await params;
  const { action } = await request.json();

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const existing = await prisma.aIAction.findFirst({
    where: { id, invoice: { customer: { companyId: company.id } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });

  const updated = await prisma.aIAction.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      reviewedById: user?.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
