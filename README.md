# AI AR Assistant — Phase 1 Scaffold

Multi-tenant SaaS foundation: auth, company/user model, and the full data
schema for invoices, contacts, communications, and AI recommendations. No
QuickBooks/Salesforce sync yet, no AI wired up yet — this is the foundation
those plug into (Phases 2-4 from the migration plan).

## What's here

- **Next.js 15 (App Router) + TypeScript + Tailwind**
- **Clerk** for auth - Clerk Organizations map 1:1 to `Company` in our schema
- **Prisma schema** (`prisma/schema.prisma`) - the full data model: Company,
  User, Integration, Customer, Contact, Invoice, Payment, Communication,
  AIAction - matching the migration plan's schema, with the `structuredReasoning`
  JSON field on `AIAction` as decided
- **Webhook** (`src/app/api/webhooks/clerk/route.ts`) that mirrors Clerk
  organizations/memberships into our own `Company`/`User` tables, so the rest
  of the app queries plain Postgres instead of calling Clerk's API per request
- **Dashboard shell** (`src/app/page.tsx`) - reads real (currently empty)
  data: total outstanding, overdue total, and a pending AI Actions list with
  Approve/Edit/Reject buttons (not wired to any mutation yet - next step)

## Setup

1. **Postgres**: get a connection string (Railway, Render, Supabase, or local
   `postgres` - any works). Put it in `.env` as `DATABASE_URL`.
2. **Clerk**: create an app at https://dashboard.clerk.com, **enable
   Organizations** in the Clerk dashboard (Configure -> Organizations - off by
   default). Copy the publishable + secret keys into `.env`.
3. **Clerk webhook**: in the Clerk dashboard, add a webhook endpoint pointing
   at `https://<your-deployed-url>/api/webhooks/clerk` (use `ngrok` or similar
   for local testing, since Clerk needs to reach it). Subscribe to
   `organization.created` and `organizationMembership.created`. Copy the
   signing secret into `.env` as `CLERK_WEBHOOK_SECRET`.
4. Copy `.env.example` to `.env` and fill in the above.

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

5. Visit `http://localhost:3000` -> sign up -> Clerk will prompt you to create
   an organization on first login if you've enabled that in Clerk's settings
   (Configure -> Organizations -> "Personal accounts" off, or leave on and add
   an explicit "Create organization" step in the UI - your call on whether
   solo users get a default personal org or must create a company).

## What's deliberately not here yet

- QuickBooks OAuth + sync worker (Phase 2) - the local sync tool we built
  earlier has working OAuth code that ports over almost directly, just needs
  to move from `.env` single-tenant credentials to per-`Integration` row
  encrypted token storage.
- Salesforce OAuth + sync worker (Phase 2)
- Customer matching service (Phase 3) - exact -> fuzzy -> AI-assisted pipeline
  as specced in the migration plan
- The AR Review Agent itself (Phase 4) - the daily job that actually creates
  `AIAction` rows
- Approve/Edit/Reject button handlers - currently static UI, no mutations
- Background job runner (BullMQ + Redis) - needed once Phase 2 sync jobs exist

## Note on tokens

`Integration.accessToken` / `refreshToken` are plain `String` columns in the
schema as a starting point. Before Phase 2 ships, these need application-layer
encryption before writes (e.g. `libsodium` or Node's built-in `crypto` with a
key from a secrets manager) - don't store QuickBooks/Salesforce tokens in
plaintext once real customer data is behind them.
