import { decideAction } from "./rules";
import { prisma } from "@/lib/prisma";

export interface ReviewResult {
  created: number;
  updated: number;
  skipped: number;
}

export async function runReviewForCompany(companyId: string): Promise<ReviewResult> {
  const invoices = await prisma.invoice.findMany({
    where: { customer: { companyId }, status: { notIn: ["PAID", "CLOSED"] } },
    include: { customer: true },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const invoice of invoices) {
    const decision = decideAction(invoice);
    if (!decision) continue;

    const existing = await prisma.aIAction.findFirst({
      where: { invoiceId: invoice.id },
      orderBy: { createdAt: "desc" },
    });

    if (existing && existing.status !== "PENDING_REVIEW") {
      // A human already reviewed the last recommendation for this invoice —
      // don't touch it or pile on a new one.
      skipped++;
      continue;
    }

    if (existing) {
      if (existing.actionType === decision.actionType) {
        skipped++;
        continue;
      }
      await prisma.aIAction.update({
        where: { id: existing.id },
        data: {
          actionType: decision.actionType,
          recommendation: decision.recommendation,
          structuredReasoning: decision.structuredReasoning,
        },
      });
      updated++;
      continue;
    }

    await prisma.aIAction.create({
      data: {
        invoiceId: invoice.id,
        actionType: decision.actionType,
        recommendation: decision.recommendation,
        structuredReasoning: decision.structuredReasoning,
      },
    });
    created++;
  }

  return { created, updated, skipped };
}
