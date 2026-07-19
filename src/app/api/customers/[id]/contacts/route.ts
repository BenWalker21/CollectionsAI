import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/tenant";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { company } = await requireCompany();
  const { id } = await params;
  const { name, email } = await request.json();

  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({ where: { id, companyId: company.id } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const contact = await prisma.contact.create({
    data: { customerId: customer.id, name, email, source: "MANUAL" },
  });

  return NextResponse.json(contact);
}
