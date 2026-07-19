import { requireCompany } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { CustomerContacts } from "@/components/CustomerContacts";
import { card } from "@/lib/ui";

function sourceBadges(customer: { quickbooksId: string | null; salesforceId: string | null; csvSourceId: string | null }) {
  const badges: string[] = [];
  if (customer.quickbooksId) badges.push("QuickBooks");
  if (customer.salesforceId) badges.push("Salesforce");
  if (customer.csvSourceId) badges.push("CSV");
  return badges;
}

export default async function CustomersPage() {
  const { company } = await requireCompany();

  const customers = await prisma.customer.findMany({
    where: { companyId: company.id },
    include: {
      contacts: true,
      invoices: { select: { balanceRemaining: true, status: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <AppHeader active="customers" />
      <div className="max-w-6xl mx-auto w-full px-6 py-10">
        <div className="mb-10">
          <h1 className="font-serif text-3xl text-navy-950">Customers</h1>
          <p className="text-sm text-navy-700/60 mt-1">{customers.length} total</p>
        </div>

        <div className="space-y-3">
          {customers.length === 0 ? (
            <p className="text-navy-700/60 text-sm">
              No customers yet — connect QuickBooks or import a CSV to bring some in.
            </p>
          ) : null}
          {customers.map((customer) => {
            const openBalance = customer.invoices
              .filter((inv) => inv.status !== "PAID" && inv.status !== "CLOSED")
              .reduce((sum, inv) => sum + Number(inv.balanceRemaining), 0);

            return (
              <div key={customer.id} className={`${card} p-4`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-navy-950">{customer.name}</p>
                    <div className="flex gap-1.5 mt-1">
                      {sourceBadges(customer).map((b) => (
                        <span key={b} className="text-xs bg-brass-100 text-brass-600 px-2 py-0.5 rounded-full">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  {openBalance > 0 ? (
                    <p className="text-sm text-navy-700/60 shrink-0">${openBalance.toLocaleString()} open</p>
                  ) : null}
                </div>
                <CustomerContacts
                  customerId={customer.id}
                  contacts={customer.contacts.map((c) => ({ id: c.id, name: c.name, email: c.email, source: c.source }))}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
