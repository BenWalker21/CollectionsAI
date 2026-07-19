import Papa from "papaparse";
import { NextResponse } from "next/server";
import { detectColumns, parseCustomerRows, type SheetRow } from "@/lib/csv/parse";
import { matchOrCreateCustomer } from "@/lib/matching/service";
import { requireCompany } from "@/lib/tenant";

export async function POST(request: Request) {
  const { company } = await requireCompany();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<SheetRow>(text, { skipEmptyLines: false });
  const rows = parsed.data;

  const { mapping, hasHeader } = detectColumns(rows);
  if (mapping.name == null) {
    return NextResponse.json({ error: "This file appears to be empty" }, { status: 400 });
  }
  const { rows: customerRows, skippedArtifacts } = parseCustomerRows(rows, mapping, hasHeader);

  let created = 0;
  let matched = 0;
  let queuedForReview = 0;

  for (const row of customerRows) {
    const result = await matchOrCreateCustomer(company.id, row.name, row.email);
    if (result.status === "created") created++;
    else if (result.status === "matched") matched++;
    else queuedForReview++;
  }

  return NextResponse.json({ created, matched, queuedForReview, skippedArtifacts, total: customerRows.length });
}
