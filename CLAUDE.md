@AGENTS.md

# Project status (as of 2026-07-19)

AI-powered accounts receivable assistant — multi-tenant SaaS. GitHub: https://github.com/BenWalker21/CollectionsAI (branch `main`). This project superseded an earlier single-tenant prototype at the sibling directory `../cac-ltv-calculator` (Supabase-based) — that project is where the QuickBooks OAuth flow was first built and proven before being ported here. Refer to it if you need to see the original, simpler pattern something here was adapted from.

## Stack
- Next.js 16.2.10 (Turbopack) + React 19.2.4 + TypeScript
- **Clerk** for auth — Organizations enabled, `automatic_organization_creation` enabled (every new user gets their own company automatically, no manual "create org" UI exists)
- **Prisma 7.8.0** with the driver-adapter pattern (`@prisma/adapter-pg`, `prisma.config.ts`) — see "Prisma 7 gotchas" below
- **Postgres** hosted on Supabase (a *separate* Supabase project from `cac-ltv-calculator`'s — this one is used only as a plain Postgres host via Prisma, not via Supabase's own client SDK/RLS)
- Tailwind 4

## What's built and verified live (all pushed to `main`)
1. **Auth + multi-tenant model** — Clerk sign-up/sign-in, Company/User/Integration/Customer/Contact/Invoice/Payment/Communication/AIAction/CustomerMatchCandidate schema, Clerk webhook (`/api/webhooks/clerk`) mirrors org/membership events into our own tables.
2. **QuickBooks integration** — OAuth (`/api/quickbooks/connect|callback|sync|disconnect`), tokens encrypted at rest (`src/lib/quickbooks/crypto.ts`, AES-256-GCM, key in `TOKEN_ENCRYPTION_KEY`) in the `Integration` table keyed by `(companyId, provider)`. Sync pulls open invoices, upserts `Customer`/`Invoice`, reconciles (marks paid when an invoice drops off QuickBooks).
3. **CSV customer import + matching** — `src/lib/csv/parse.ts` + `src/lib/matching/` (exact normalized-name match → Dice-coefficient fuzzy match ≥0.90 auto-links, 0.55-0.90 queues a `CustomerMatchCandidate` for human review, below that creates a new customer). The importer filters out financial-report artifact rows (titles, dates, "Total for X" subtotals, aging-bucket labels) — added after a real AR aging report got imported as 111 garbage customers; see git log for that incident.
4. **AR Review Agent (rule-based, not AI)** — `src/lib/agent/rules.ts` + `review.ts`: days-overdue thresholds (≤15 friendly, ≤45 firm, >45 escalate) generate `AIAction` recommendations, on-demand via a "Run AR Review" button. Approve/Reject wired to real mutations; **Edit is not wired** (static button, out of scope so far). AI-driven reasoning was explicitly considered and declined twice by the user in favor of this rule-based version — don't build the AI version without asking again.
5. **Customers page** (`/customers`) — lists all customers with source badges (QuickBooks/Salesforce/CSV) and inline-editable contacts (`src/components/CustomerContacts.tsx`).

## Explicitly NOT built yet
- Salesforce sync (schema anticipates it — `IntegrationProvider.SALESFORCE`, `Customer.salesforceId`, `ContactSource.SALESFORCE` — but no code)
- Actual email sending — `Communication` model exists but nothing creates rows there. Approving an `AIAction` today only changes its status; it does not send anything. The natural next step here is reusing the tier-based email templates already proven in `cac-ltv-calculator/lib/collections/templates.ts`.
- Any deployment — this only runs on localhost right now (`.env`, not `.env.local` — matches this scaffold's original convention, unlike `cac-ltv-calculator` which uses `.env.local`)
- Background job scheduler — README's Phase 2 note about needing BullMQ+Redis is still true; every sync/review/import action here is a manual on-demand button, not a cron/queue
- AI-driven matching (3rd tier of exact→fuzzy→AI) and AI-driven review-agent reasoning — both declined in favor of rule-based/human-review alternatives

## Local dev setup
```
npm install
cp .env.example .env   # fill in DATABASE_URL, Clerk keys, QuickBooks keys, TOKEN_ENCRYPTION_KEY
npm run dev            # port 3000
```
For Clerk webhooks locally (org creation → Company sync), run in a separate terminal:
```
npx clerk@latest webhooks listen --token "c_N9f9oPF1bu" --forward-to http://localhost:3000/api/webhooks/clerk
```
(That relay token is already registered as a webhook endpoint in the Clerk dashboard for this app — don't regenerate it unless it stops working.)

## Gotchas hit and fixed (don't rediscover these)
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`** (same behavior, `AGENTS.md` warns about exactly this class of breaking change). Already migrated.
- **Prisma 7 removed `datasource { url = env(...) }` from schema.prisma.** Connection config now lives in `prisma.config.ts` (`defineConfig`), and `PrismaClient` needs an explicit driver adapter (`new PrismaPg({ connectionString })`) passed to its constructor — see `src/lib/prisma.ts`. Plain `new PrismaClient()` does not work anymore.
- **`prisma migrate dev` doesn't work in this environment** (non-interactive shell, no TTY for its confirmation prompts). The working pattern for every migration so far: `npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script` to generate the SQL, hand-write it into a new `prisma/migrations/<timestamp>_<name>/migration.sql` file, then `npx prisma migrate deploy` (non-interactive, applies cleanly).
- **`requireCompany()` (`src/lib/tenant.ts`) needed a fallback**: Clerk's session-level "active organization" (`orgId` from `auth()`) isn't always set on a fresh sign-in even when the user already belongs to one (e.g. after sign-out/sign-in, or a new browser). It now falls back to `User.companyId` (synced via the Clerk webhook) instead of hard-failing. Every user in this app belongs to exactly one company, so the fallback is unambiguous — don't add multi-org-per-user support without revisiting this.
- **Dev server needs a restart after any Prisma schema/client regeneration or new env var** — Next's dev server doesn't hot-reload a regenerated Prisma Client or newly-added `.env` values. This has caused multiple confusing "undefined" / stale-config errors in this project; always mention the restart when landing a schema or env change.
- **CSV import is for a plain 2-column (name, email) customer list, not financial exports.** It now filters obvious report-artifact rows, but it's not a general-purpose parser — don't assume it can ingest an arbitrary accounting export.

## Verification pattern used throughout
No test suite exists. Everything so far has been verified by: `npx tsc --noEmit`, `npm run build`, then a standalone script using `@prisma/adapter-pg` + `PrismaClient` directly against the real dev database (see git log for examples — e.g. the QuickBooks sync, matching-tier, and AR Review Agent verifications), cleaning up any test-only rows afterward. UI-level flows (OAuth consent, sign-in) that need a real browser session are handed back to the user to click through, since Claude can't complete Clerk/Intuit logins itself.
