import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * Every query in the app should go through this to guarantee tenant isolation.
 * Clerk's orgId maps 1:1 to our Company.id (set when a Clerk Organization is created
 * via the onboarding flow — see app/api/webhooks/clerk/route.ts, to be added in Phase 1b).
 */
export async function requireCompany() {
  const { orgId, userId } = await auth();

  if (!userId) {
    throw new Error('No active session.');
  }

  // Clerk's session-level "active organization" isn't always set on a fresh
  // sign-in even when the user already belongs to one (e.g. after signing
  // out and back in, or a new device/browser) — fall back to the membership
  // our own webhook already synced. Every user here belongs to exactly one
  // company, so there's no ambiguity to resolve.
  const companyId = orgId ?? (await prisma.user.findUnique({ where: { clerkUserId: userId } }))?.companyId ?? null;

  if (!companyId) {
    throw new Error('No active organization/company in session.');
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });

  if (!company) {
    throw new Error(`No Company record found for Clerk org ${companyId}. Has onboarding completed?`);
  }

  return { company, userId };
}
