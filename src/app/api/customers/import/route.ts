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

  const { mapping } = detectColumns(rows);
  if (mapping.name == null) {
    return NextResponse.json({ error: "Could not find a customer name column in this file" }, { status: 400 });
  }
  const customerRows = parseCustomerRows(rows, mapping);

  let created = 0;
  let matched = 0;
  let queuedForReview = 0;

  for (const row of customerRows) {
    const result = await matchOrCreateCustomer(company.id, row.name, row.email);
    if (result.status === "created") created++;
    else if (result.status === "matched") matched++;
    else queuedForReview++;
  }

  return NextResponse.json({ created, matched, queuedForReview, total: customerRows.length });
}
