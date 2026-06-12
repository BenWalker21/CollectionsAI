# CollectionsAI

CollectionsAI is a marketing website and paid-workspace demo for an AI collections copilot.

The project presents the product concept around:

- AI prioritization for overdue invoices
- Smart collections queues
- Personalized email follow-ups
- Promise-to-pay tracking
- Collections analytics and recovered cash reporting

## Website demo

The website demo is available at:

```text
/demo/
```

It includes:

- Drag-and-drop AR aging CSV upload
- Comparison against the previous upload to show paid/reduced balances
- QuickBooks, Gmail, and Outlook connection entry points
- Sample or uploaded overdue invoice queue
- AI priority reasons
- Ready-to-send follow-up email drafts
- Campaign CSV export for email outreach
- Promise tracking examples
- Stripe Checkout scaffold for paid subscription access

The fastest MVP path is uploading an AR aging summary exported from QuickBooks,
Xero, or an ERP with customer email addresses. Users can export approved email
drafts immediately. Paid users can link Gmail or Outlook so drafts are created
for review inside their inbox. OAuth and Stripe routes are scaffolded in `server.mjs`;
real payments and email linking require credentials in `.env`.

## Local preview

Copy the example environment file:

```bash
cp .env.example .env
```

Start the local server:

```bash
npm run serve
```

Then open `http://localhost:4173`.

## Checks

```bash
npm run check
```

## Setup guides

See [docs/setup.md](docs/setup.md) for the QuickBooks, Gmail, and Outlook credential setup steps.
See [docs/ar-aging-upload.md](docs/ar-aging-upload.md) for the upload-first MVP workflow.
See [docs/billing.md](docs/billing.md) for Stripe subscription setup.
