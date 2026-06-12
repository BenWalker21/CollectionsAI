# AR aging upload MVP

Users can start without connecting QuickBooks.

## User workflow

1. Export an AR aging summary from QuickBooks, Xero, or an ERP as a CSV file.
2. Open the CollectionsAI website demo.
3. Drag the CSV onto the upload box.
4. Review the ranked collections queue.
5. Copy, open, or export the suggested follow-up email drafts with payment links included.
6. Upload the next AR aging summary later to see what changed.

## Repeated uploads

Each upload is saved in the user's browser as the latest baseline.

When the user uploads a newer AR aging summary, CollectionsAI compares it to the previous upload and shows:

- Paid in full: customer had an overdue balance before and no longer appears overdue
- Partially paid: overdue balance decreased
- Balance increased: overdue balance went up
- New overdue balance: customer appears overdue for the first time

This lets users prove collections progress without a full QuickBooks connection.

## Supported CSV columns

The parser looks for a customer/name column plus either aging buckets or a balance column.

Recommended columns:

```text
Customer,Email,Payment Link,Current,1 - 30,31 - 60,61 - 90,91 and over,Total
```

Also supported:

- `Name`, `Client`, or `Company` instead of `Customer`
- `Email`, `Email Address`, `Contact Email`, `AP Email`, or `Billing Email`
- `Payment Link`, `Pay Link`, `Invoice Link`, `Invoice URL`, or `Payment URL`
- `Balance`, `Open Balance`, or `Amount Due` instead of `Total`
- Common aging bucket variants such as `1-30`, `31-60`, `61-90`, and `90+`

## Email workflow

If the CSV includes email addresses, CollectionsAI can immediately:

- Generate one follow-up draft per overdue customer
- Include the invoice payment link in each draft when available
- Open the selected draft in the user's email client
- Export all drafts as `collectionsai-email-campaign.csv`

The campaign CSV contains customer, email, payment link, subject, body, amount,
days overdue, tone, and priority score. This is useful for Gmail, Outlook, or
mail merge tools before direct inbox sending is connected.

## Why this is the best first step

AR aging upload avoids the friction of OAuth setup while still proving the core value:

- Identify overdue balances
- Rank the highest-impact customers
- Draft ready-to-send follow-up emails
- Show expected cash recovery

QuickBooks, Gmail, and Outlook connections can be added after users validate the workflow.
