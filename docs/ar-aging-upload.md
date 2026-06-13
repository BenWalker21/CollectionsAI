# AR aging upload MVP

Users can start without connecting QuickBooks.

## User workflow

1. Export an AR aging summary from QuickBooks, Xero, or an ERP as a CSV file.
2. Open the CollectionsAI website demo.
3. Drag the CSV onto the upload box, or click **Upload your AR CSV**.
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

QuickBooks AR Aging Summary exports are supported. The parser skips QBO report
title rows, detects the aging bucket header row, and uses `Total for ...` rows as
customer-level balances.

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

## Using real company data

For the website demo, upload a CSV export only. If QuickBooks gives you Excel,
save/export the file as CSV first.

The demo processes the CSV in the browser. It does not store the uploaded file
on the server. Production paid accounts should store data in a secure database
with user accounts and access controls.

If your AR aging export does not include email addresses or payment links,
CollectionsAI will still rank the queue, but the draft will show:

- `Email address needed`
- `payment link needed`

## Email workflow

If the CSV includes email addresses, CollectionsAI can immediately:

- Generate one follow-up draft per overdue customer
- Include the invoice payment link in each draft when available
- Open the selected draft in the user's email client
- Download an `.eml` draft that opens as an unsent email
- Export all drafts as `collectionsai-email-campaign.csv`
- Log when a follow-up is sent so future drafts can escalate tone

The campaign CSV contains customer, email, payment link, subject, body, amount,
days overdue, tone, and priority score. This is useful for Gmail, Outlook, or
mail merge tools before direct inbox sending is connected.

## Why this is the best first step

AR aging upload avoids the friction of OAuth setup while still proving the core value:

- Identify overdue balances
- Rank the highest-impact customers
- Draft ready-to-send follow-up emails
- Show expected cash recovery

## Sender settings

The demo includes sender settings for:

- sender name
- company
- reply-to email
- phone
- payment instructions

These values are saved in the browser and used in generated email signatures.
Production paid accounts should store these settings per user/team in the
database.

QuickBooks, Gmail, and Outlook connections can be added after users validate the workflow.
