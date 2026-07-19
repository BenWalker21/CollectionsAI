import { fetchOpenInvoices } from "./client";
import type { QbInvoiceRecord } from "./types";
import { prisma } from "@/lib/prisma";

function daysPastDue(due: Date): number {
  return Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000));
}

// Placeholder scoring until Phase 4's AR Review Agent replaces it: weights
// balance (relative to the largest open invoice in this sync batch) and age.
function priorityScore(balance: number, daysOverdue: number, maxBalance: number): number {
  const balanceWeight = maxBalance > 0 ? balance / maxBalance : 0;
  const ageWeight = Math.min(daysOverdue / 90, 1);
  return 0.6 * balanceWeight + 0.4 * ageWeight;
}

export interface SyncResult {
  customersUpserted: number;
  invoicesUpserted: number;
  invoicesMarkedPaid: number;
}

export async function syncInvoicesForCompany(companyId: string, accessToken: string, realmId: string): Promise<SyncResult> {
  const records = await fetchOpenInvoices(accessToken, realmId);
  const maxBalance = records.reduce((max: number, r: QbInvoiceRecord) => Math.max(max, r.Balance), 0);

  let customersUpserted = 0;
  let invoicesUpserted = 0;

  for (const record of records) {
    const customerName = record.CustomerRef.name || record.CustomerRef.value;
    const customer = await prisma.customer.upsert({
      where: { companyId_quickbooksId: { companyId, quickbooksId: record.CustomerRef.value } },
      update: { name: customerName },
      create: { companyId, name: customerName, quickbooksId: record.CustomerRef.value },
    });
    customersUpserted++;

    const due = record.DueDate ? new Date(record.DueDate) : new Date();
    const overdue = daysPastDue(due);

    await prisma.invoice.upsert({
      where: { customerId_quickbooksId: { customerId: customer.id, quickbooksId: record.Id } },
      update: {
        invoiceNumber: record.DocNumber || record.Id,
        amount: record.TotalAmt,
        balanceRemaining: record.Balance,
        dueDate: due,
        daysOverdue: overdue,
        priorityScore: priorityScore(record.Balance, overdue, maxBalance),
      },
      create: {
        customerId: customer.id,
        quickbooksId: record.Id,
        invoiceNumber: record.DocNumber || record.Id,
        amount: record.TotalAmt,
        balanceRemaining: record.Balance,
        dueDate: due,
        status: overdue > 0 ? "OVERDUE" : "CURRENT",
        daysOverdue: overdue,
        priorityScore: priorityScore(record.Balance, overdue, maxBalance),
      },
    });
    invoicesUpserted++;
  }

  const stillOpenIds = new Set(records.map((r) => r.Id));
  const previouslySynced = await prisma.invoice.findMany({
    where: {
      customer: { companyId },
      quickbooksId: { not: null },
      status: { notIn: ["PAID", "CLOSED"] },
    },
    select: { id: true, quickbooksId: true },
  });
  const nowPaidIds = previouslySynced.filter((inv) => inv.quickbooksId && !stillOpenIds.has(inv.quickbooksId)).map((inv) => inv.id);

  if (nowPaidIds.length) {
    await prisma.invoice.updateMany({
      where: { id: { in: nowPaidIds } },
      data: { status: "PAID", balanceRemaining: 0, daysOverdue: 0 },
    });
  }

  return { customersUpserted, invoicesUpserted, invoicesMarkedPaid: nowPaidIds.length };
}
