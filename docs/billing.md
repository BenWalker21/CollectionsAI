# Paid access setup

CollectionsAI is intended to be a paid website workflow.

The subscription button is already routed to:

```text
/api/billing/checkout
```

Until Stripe keys are added, it returns users to the demo with a setup message.

## Stripe setup

1. Create a Stripe account.
2. Create a subscription product.
3. Create a recurring price for that product.
4. Copy the Stripe secret key and price ID.
5. Add them to `.env`:

```text
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRICE_ID=your_recurring_price_id
STRIPE_SUCCESS_URL=https://your-domain.com/demo/?paid=success
STRIPE_CANCEL_URL=https://your-domain.com/#paid
```

## Production note

Before launch, add:

- User accounts
- Stripe webhook handling
- A database field for subscription status
- Access checks before uploads, email linking, and draft generation

The current version is a scaffold that shows the intended paid flow.
