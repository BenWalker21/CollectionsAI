import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * Every query in the app should go through this to guarantee tenant isolation.
 * Clerk's orgId maps 1:1 to our Company.id (set when a Clerk Organization is created
 * via the onboarding flow — see app/api/webhooks/clerk/route.ts, to be added in Phase 1b).
 */
export async function requireCompany() {
  const { orgId, userId } = await auth();

  if (!orgId || !userId) {
    throw new Error('No active organization/company in session.');
  }

  const company = await prisma.company.findUnique({ where: { id: orgId } });

  if (!company) {
    throw new Error(`No Company record found for Clerk org ${orgId}. Has onboarding completed?`);
  }

  return { company, userId };
}
