import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/tenant";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { company } = await requireCompany();
  const { id } = await params;
  const { email, name } = await request.json();

  const existing = await prisma.contact.findFirst({
    where: { id, customer: { companyId: company.id } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      ...(email !== undefined ? { email } : {}),
      ...(name !== undefined ? { name } : {}),
    },
  });

  return NextResponse.json(updated);
}
