import { normalizeCustomerName } from "./normalize";
import { diceCoefficient } from "./similarity";
import { prisma } from "@/lib/prisma";

const AUTO_MATCH_THRESHOLD = 0.9;
const REVIEW_THRESHOLD = 0.55;

export type MatchResult =
  | { status: "matched"; customerId: string }
  | { status: "queued_for_review"; candidateId: string }
  | { status: "created"; customerId: string };

async function attachContact(customerId: string, candidateName: string, candidateEmail?: string) {
  if (!candidateEmail) return;
  const existing = await prisma.contact.findFirst({ where: { customerId, email: candidateEmail } });
  if (existing) return;
  await prisma.contact.create({
    data: {
      customerId,
      // The CSV format here is Name + Email (a customer/company list, not a
      // separate contact-person name) — fall back to the candidate name.
      name: candidateName,
      email: candidateEmail,
      source: "CSV",
    },
  });
}

async function linkToExistingCustomer(
  customerId: string,
  candidateName: string,
  candidateEmail: string | undefined,
  confidence: number,
): Promise<MatchResult> {
  await prisma.customer.update({
    where: { id: customerId },
    data: { csvSourceId: candidateName, matchConfidence: confidence * 100 },
  });
  await attachContact(customerId, candidateName, candidateEmail);
  return { status: "matched", customerId };
}

export async function matchOrCreateCustomer(
  companyId: string,
  candidateName: string,
  candidateEmail?: string,
): Promise<MatchResult> {
  const normalizedCandidate = normalizeCustomerName(candidateName);
  const existingCustomers = await prisma.customer.findMany({ where: { companyId } });

  const exact = existingCustomers.find((c) => normalizeCustomerName(c.name) === normalizedCandidate);
  if (exact) {
    return linkToExistingCustomer(exact.id, candidateName, candidateEmail, 1);
  }

  let best: { customerId: string; score: number } | null = null;
  for (const c of existingCustomers) {
    const score = diceCoefficient(normalizedCandidate, normalizeCustomerName(c.name));
    if (!best || score > best.score) best = { customerId: c.id, score };
  }

  if (best && best.score >= AUTO_MATCH_THRESHOLD) {
    return linkToExistingCustomer(best.customerId, candidateName, candidateEmail, best.score);
  }

  if (best && best.score >= REVIEW_THRESHOLD) {
    const candidate = await prisma.customerMatchCandidate.create({
      data: {
        companyId,
        candidateName,
        candidateEmail,
        matchedCustomerId: best.customerId,
        confidence: best.score * 100,
      },
    });
    return { status: "queued_for_review", candidateId: candidate.id };
  }

  const created = await prisma.customer.create({
    data: { companyId, name: candidateName, csvSourceId: candidateName, matchConfidence: 0 },
  });
  await attachContact(created.id, candidateName, candidateEmail);
  return { status: "created", customerId: created.id };
}

export async function confirmMatchCandidate(companyId: string, candidateId: string): Promise<MatchResult> {
  const candidate = await prisma.customerMatchCandidate.findFirst({ where: { id: candidateId, companyId } });
  if (!candidate) throw new Error("Match candidate not found");

  const result = await linkToExistingCustomer(
    candidate.matchedCustomerId,
    candidate.candidateName,
    candidate.candidateEmail ?? undefined,
    candidate.confidence / 100,
  );
  await prisma.customerMatchCandidate.update({ where: { id: candidateId }, data: { status: "CONFIRMED" } });
  return result;
}

export async function rejectMatchCandidate(companyId: string, candidateId: string): Promise<MatchResult> {
  const candidate = await prisma.customerMatchCandidate.findFirst({ where: { id: candidateId, companyId } });
  if (!candidate) throw new Error("Match candidate not found");

  const created = await prisma.customer.create({
    data: {
      companyId,
      name: candidate.candidateName,
      csvSourceId: candidate.candidateName,
      matchConfidence: 0,
    },
  });
  await attachContact(created.id, candidate.candidateName, candidate.candidateEmail ?? undefined);
  await prisma.customerMatchCandidate.update({ where: { id: candidateId }, data: { status: "REJECTED" } });
  return { status: "created", customerId: created.id };
}
