import { requireCompany } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ActionButtons } from "@/components/ActionButtons";
import { AppHeader } from "@/components/AppHeader";
import { CsvImport } from "@/components/CsvImport";
import { MatchReviewQueue } from "@/components/MatchReviewQueue";
import { QuickBooksConnect } from "@/components/QuickBooksConnect";
import { RunReviewButton } from "@/components/RunReviewButton";
import { card } from "@/lib/ui";
import type { Invoice, Customer, AIAction } from "@prisma/client";

type InvoiceWithCustomer = Invoice & { customer: Customer };
type ActionWithInvoice = AIAction & { invoice: InvoiceWithCustomer };

export default async function DashboardPage() {
  const { company } = await requireCompany();

  const invoices: InvoiceWithCustomer[] = await prisma.invoice.findMany({
    where: { customer: { companyId: company.id }, status: { not: "PAID" } },
    include: { customer: true },
  });

  const totalOutstanding = invoices.reduce(
    (sum: number, inv: InvoiceWithCustomer) => sum + Number(inv.balanceRemaining),
    0
  );
  const overdue = invoices.filter((inv: InvoiceWithCustomer) => inv.daysOverdue > 0);
  const totalOverdue = overdue.reduce(
    (sum: number, inv: InvoiceWithCustomer) => sum + Number(inv.balanceRemaining),
    0
  );

  const pendingActions: ActionWithInvoice[] = await prisma.aIAction.findMany({
    where: { status: "PENDING_REVIEW", invoice: { customer: { companyId: company.id } } },
    include: { invoice: { include: { customer: true } } },
    orderBy: { invoice: { priorityScore: "desc" } },
  });

  const qbIntegration = await prisma.integration.findUnique({
    where: { companyId_provider: { companyId: company.id, provider: "QUICKBOOKS" } },
  });

  const pendingMatchCandidates = await prisma.customerMatchCandidate.findMany({
    where: { companyId: company.id, status: "PENDING" },
    include: { matchedCustomer: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <AppHeader active="dashboard" />
      <div className="max-w-6xl mx-auto w-full px-6 py-10">
        <div className="flex items-start justify-between gap-6 flex-wrap mb-10">
          <div>
            <h1 className="font-serif text-3xl text-navy-950">{company.name}</h1>
            <p className="text-sm text-navy-700/60 mt-1">Accounts receivable overview</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <RunReviewButton />
            <CsvImport />
            <QuickBooksConnect
              connected={qbIntegration?.status === "CONNECTED"}
              companyName={qbIntegration?.externalOrgName ?? null}
            />
          </div>
        </div>

        {pendingMatchCandidates.length > 0 ? (
          <MatchReviewQueue
            candidates={pendingMatchCandidates.map((c) => ({
              id: c.id,
              candidateName: c.candidateName,
              candidateEmail: c.candidateEmail,
              confidence: c.confidence,
              matchedCustomerName: c.matchedCustomer.name,
            }))}
          />
        ) : null}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <SummaryCard label="Total Outstanding" value={totalOutstanding} />
          <SummaryCard label="Overdue" value={totalOverdue} tone="warning" />
          <SummaryCard label="AI Actions Pending" value={pendingActions.length} isCount />
        </section>

        <section className="mb-10">
          <h2 className="font-serif text-xl text-navy-950 mb-4">Open Invoices</h2>
          <div className="space-y-2.5">
            {invoices.length === 0 && (
              <p className="text-navy-700/60 text-sm">
                No open invoices yet — connect QuickBooks and sync to pull them in.
              </p>
            )}
            {invoices.map((inv) => (
              <div key={inv.id} className={`${card} p-4 flex items-center justify-between`}>
                <div>
                  <p className="font-medium text-navy-950">{inv.customer.name}</p>
                  <p className="text-sm text-navy-700/60">Invoice {inv.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-navy-950">${Number(inv.balanceRemaining).toLocaleString()}</p>
                  <p className="text-sm text-navy-700/60">
                    {inv.daysOverdue > 0 ? `${inv.daysOverdue} days overdue` : inv.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-serif text-xl text-navy-950 mb-4">Recommended Actions</h2>
          <div className="space-y-3">
            {pendingActions.length === 0 && (
              <p className="text-navy-700/60 text-sm">
                No pending recommendations. Click &ldquo;Run AR Review&rdquo; above to check your
                open invoices.
              </p>
            )}
            {pendingActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  isCount,
}: {
  label: string;
  value: number;
  tone?: "warning";
  isCount?: boolean;
}) {
  return (
    <div className={`${card} p-5`}>
      <p className="text-sm text-navy-700/60">{label}</p>
      <p className={`text-2xl font-serif mt-1 ${tone === "warning" ? "text-rust-600" : "text-navy-950"}`}>
        {isCount ? value : `$${value.toLocaleString()}`}
      </p>
    </div>
  );
}

function ActionCard({ action }: { action: ActionWithInvoice }) {
  const reasoning = action.structuredReasoning as Record<string, unknown>;

  return (
    <div className={`${card} p-5 flex items-start justify-between`}>
      <div>
        <p className="font-medium text-navy-950">{action.invoice.customer.name}</p>
        <p className="text-sm text-navy-700/60">
          ${Number(action.invoice.balanceRemaining).toLocaleString()} overdue
        </p>
        <p className="text-sm text-navy-800 mt-2">
          <span className="font-medium">Recommended:</span> {action.recommendation}
        </p>
        <ul className="text-xs text-navy-700/60 mt-1 list-disc list-inside">
          {Object.entries(reasoning || {}).map(([key, val]) => (
            <li key={key}>
              {key}: {String(val)}
            </li>
          ))}
        </ul>
      </div>
      <ActionButtons actionId={action.id} />
    </div>
  );
}
