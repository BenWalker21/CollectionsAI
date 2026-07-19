import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { prisma } from '@/lib/prisma';

/**
 * Clerk is the source of truth for auth identity; this webhook mirrors the
 * subset we need (Company = Clerk Organization, User = Clerk User + membership)
 * into our own DB so the rest of the app can join against Company/User with
 * plain Postgres queries instead of calling Clerk's API on every request.
 *
 * Configure this URL in the Clerk dashboard: Webhooks -> Add Endpoint
 * Events to subscribe: organization.created, organizationMembership.created
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response('CLERK_WEBHOOK_SECRET not configured', { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: any;
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch {
    return new Response('Invalid webhook signature', { status: 400 });
  }

  switch (event.type) {
    case 'organization.created': {
      const { id, name } = event.data;
      await prisma.company.upsert({
        where: { id },
        update: { name },
        create: { id, name, subscriptionPlan: 'starter' },
      });
      break;
    }
    case 'organizationMembership.created': {
      const { organization, public_user_data, role } = event.data;
      await prisma.user.upsert({
        where: { clerkUserId: public_user_data.user_id },
        update: { companyId: organization.id },
        create: {
          clerkUserId: public_user_data.user_id,
          companyId: organization.id,
          email: public_user_data.identifier,
          role: role === 'org:admin' ? 'ADMIN' : 'VIEWER',
        },
      });
      break;
    }
    default:
      break;
  }

  return new Response('OK', { status: 200 });
}
