-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "externalOrgName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_companyId_quickbooksId_key" ON "customers"("companyId", "quickbooksId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_customerId_quickbooksId_key" ON "invoices"("customerId", "quickbooksId");
