import type { Customer, Invoice } from "@prisma/client";

export type Tone = "friendly" | "firm" | "final";

export interface ActionDecision {
  actionType: "SEND_REMINDER" | "ESCALATE_TO_HUMAN" | "MARK_DISPUTED";
  recommendation: string;
  structuredReasoning: {
    daysOverdue: number;
    balanceRemaining: number;
    recommendedTone?: Tone;
  };
}

type InvoiceWithCustomer = Invoice & { customer: Customer };

export function decideAction(invoice: InvoiceWithCustomer): ActionDecision | null {
  const daysOverdue = invoice.daysOverdue;
  const balanceRemaining = Number(invoice.balanceRemaining);

  if (invoice.status === "DISPUTED") {
    return {
      actionType: "MARK_DISPUTED",
      recommendation: "Already marked disputed — hold outreach until resolved",
      structuredReasoning: { daysOverdue, balanceRemaining },
    };
  }

  if (daysOverdue <= 0) return null;

  if (daysOverdue <= 15) {
    return {
      actionType: "SEND_REMINDER",
      recommendation: "Send friendly reminder",
      structuredReasoning: { daysOverdue, balanceRemaining, recommendedTone: "friendly" },
    };
  }

  if (daysOverdue <= 45) {
    return {
      actionType: "SEND_REMINDER",
      recommendation: "Send firm follow-up",
      structuredReasoning: { daysOverdue, balanceRemaining, recommendedTone: "firm" },
    };
  }

  return {
    actionType: "ESCALATE_TO_HUMAN",
    recommendation: "Significantly overdue — escalate for final notice or collections",
    structuredReasoning: { daysOverdue, balanceRemaining, recommendedTone: "final" },
  };
}
