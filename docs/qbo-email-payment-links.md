# QBO email and payment link requirements

The paid version needs QuickBooks Online to provide two fields automatically:

1. Customer email address
2. Invoice payment link

## Customer email

Preferred source:

```text
Customer.PrimaryEmailAddr.Address
```

Fallback source:

```text
Invoice.BillEmail.Address
```

If neither exists, CollectionsAI should flag the customer as:

```text
Email address needed
```

## Payment link

Preferred source:

```text
Invoice.InvoiceLink
```

This depends on QBO invoice and online payment settings.

Fallback:

- Stored manual payment link
- Generated hosted payment link
- Draft wording that asks the customer to reply if they need the link resent

## Draft behavior

When a payment link is available, every generated email should include:

```text
Payment link: https://...
```

When a payment link is missing, the draft should not pretend one exists. It
should say:

```text
If helpful, I can resend the payment link.
```

## Demo/API scaffold

The demo API exposes the intended field map at:

```text
/api/qbo/field-map
```

This endpoint documents the QBO fields the production sync job should use.
