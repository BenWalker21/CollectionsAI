-- CreateEnum
CREATE TYPE "MatchCandidateStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "customer_match_candidates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT,
    "matchedCustomerId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "MatchCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_match_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_match_candidates_companyId_status_idx" ON "customer_match_candidates"("companyId", "status");

-- AddForeignKey
ALTER TABLE "customer_match_candidates" ADD CONSTRAINT "customer_match_candidates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_match_candidates" ADD CONSTRAINT "customer_match_candidates_matchedCustomerId_fkey" FOREIGN KEY ("matchedCustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
