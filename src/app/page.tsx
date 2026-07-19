import { requireCompany } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { QuickBooksConnect } from "@/components/QuickBooksConnect";
import { UserButton } from "@clerk/nextjs";
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

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-10">
      <header className="flex items-center justify-between mb-10">
        <h1 className="text-2xl font-semibold text-slate-900">{company.name} — AR Dashboard</h1>
        <div className="flex items-center gap-4">
          <QuickBooksConnect
            connected={qbIntegration?.status === "CONNECTED"}
            companyName={qbIntegration?.externalOrgName ?? null}
          />
          <UserButton />
        </div>
      </header>

      <section className="grid grid-cols-3 gap-4 mb-10">
        <SummaryCard label="Total Outstanding" value={totalOutstanding} />
        <SummaryCard label="Overdue" value={totalOverdue} tone="warning" />
        <SummaryCard label="AI Actions Pending" value={pendingActions.length} isCount />
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Open Invoices</h2>
        <div className="space-y-2">
          {invoices.length === 0 && (
            <p className="text-slate-500 text-sm">
              No open invoices yet — connect QuickBooks and sync to pull them in.
            </p>
          )}
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{inv.customer.name}</p>
                <p className="text-sm text-slate-500">Invoice {inv.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-900">${Number(inv.balanceRemaining).toLocaleString()}</p>
                <p className="text-sm text-slate-500">{inv.daysOverdue > 0 ? `${inv.daysOverdue} days overdue` : inv.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900 mb-4">Recommended Actions</h2>
        <div className="space-y-3">
          {pendingActions.length === 0 && (
            <p className="text-slate-500 text-sm">
              No pending recommendations. The AR Review Agent runs daily and will populate this
              list once it has processed synced invoices.
            </p>
          )}
          {pendingActions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      </section>
    </div>
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
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 ${
          tone === "warning" ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {isCount ? value : `$${value.toLocaleString()}`}
      </p>
    </div>
  );
}

function ActionCard({ action }: { action: ActionWithInvoice }) {
  const reasoning = action.structuredReasoning as Record<string, unknown>;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-start justify-between">
      <div>
        <p className="font-medium text-slate-900">{action.invoice.customer.name}</p>
        <p className="text-sm text-slate-500">
          ${Number(action.invoice.balanceRemaining).toLocaleString()} overdue
        </p>
        <p className="text-sm text-slate-700 mt-2">
          <span className="font-medium">Recommended:</span> {action.recommendation}
        </p>
        <ul className="text-xs text-slate-500 mt-1 list-disc list-inside">
          {Object.entries(reasoning || {}).map(([key, val]) => (
            <li key={key}>
              {key}: {String(val)}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2 shrink-0 ml-4">
        <button className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700">
          Approve
        </button>
        <button className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50">
          Edit
        </button>
        <button className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50 text-red-600">
          Reject
        </button>
      </div>
    </div>
  );
}
