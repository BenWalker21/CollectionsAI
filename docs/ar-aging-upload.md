# AR aging upload MVP

Users can start without connecting QuickBooks.

## User workflow

1. Export an AR aging summary from QuickBooks, Xero, or an ERP as a CSV file.
2. Open the CollectionsAI app.
3. Drag the CSV onto the upload box.
4. Review the ranked collections queue.
5. Copy or approve the suggested follow-up drafts.

## Supported CSV columns

The parser looks for a customer/name column plus either aging buckets or a balance column.

Recommended columns:

```text
Customer,Current,1 - 30,31 - 60,61 - 90,91 and over,Total
```

Also supported:

- `Name`, `Client`, or `Company` instead of `Customer`
- `Balance`, `Open Balance`, or `Amount Due` instead of `Total`
- Common aging bucket variants such as `1-30`, `31-60`, `61-90`, and `90+`

## Why this is the best first step

AR aging upload avoids the friction of OAuth setup and app review while still proving the core value:

- Identify overdue balances
- Rank the highest-impact customers
- Draft follow-up emails
- Show expected cash recovery

QuickBooks, Gmail, and Outlook connections can be added after users validate the workflow.
