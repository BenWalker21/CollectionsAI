import Papa from "papaparse";

export type SheetRow = string[];

export interface CustomerRow {
  name: string;
  email?: string;
}

export interface ColumnMapping {
  name: number | null;
  email: number | null;
}

const NAME_SYNONYMS = ["customer name", "company", "company name", "customer", "name", "account"];
const EMAIL_SYNONYMS = ["email", "email address", "contact email"];

function cell(row: SheetRow, idx: number | null): string {
  return idx == null || idx >= row.length ? "" : String(row[idx] ?? "").trim();
}

function matchColumn(headerLower: string[], synonyms: string[]): number | null {
  for (const syn of synonyms) {
    const idx = headerLower.findIndex((h) => h.includes(syn));
    if (idx !== -1) return idx;
  }
  return null;
}

export function detectColumns(rows: SheetRow[]): { header: string[]; mapping: ColumnMapping } {
  const header = (rows[0] || []).map((c) => String(c || "").trim());
  const headerLower = header.map((h) => h.toLowerCase());
  return {
    header,
    mapping: {
      name: matchColumn(headerLower, NAME_SYNONYMS),
      email: matchColumn(headerLower, EMAIL_SYNONYMS),
    },
  };
}

export function parseCustomerRows(rows: SheetRow[], mapping: ColumnMapping): CustomerRow[] {
  const out: CustomerRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some((c) => String(c || "").trim())) continue;
    const name = cell(row, mapping.name);
    if (!name) continue;
    const email = cell(row, mapping.email);
    out.push({ name, email: email || undefined });
  }
  return out;
}

export function fileToRows(file: File): Promise<SheetRow[]> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => resolve(results.data as SheetRow[]),
    });
  });
}
