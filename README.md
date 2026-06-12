# CollectionsAI

CollectionsAI is a marketing homepage and MVP app shell for an AI collections copilot.

The project presents the product concept around:

- AI prioritization for overdue invoices
- Smart collections queues
- Personalized email follow-ups
- Promise-to-pay tracking
- Collections analytics and recovered cash reporting

## App demo

The MVP app is available at:

```text
/app/
```

It includes:

- QuickBooks, Gmail, and Outlook connection entry points
- Sample overdue invoice queue
- AI priority reasons
- Draft follow-up emails
- Promise tracking examples

Connection routes are scaffolded in `server.mjs`. Real account connections require OAuth credentials in `.env`.

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
