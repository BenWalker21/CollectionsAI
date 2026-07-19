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

function looksLikeEmail(v: unknown): boolean {
  return /\S+@\S+\.\S+/.test(String(v ?? ""));
}

// Financial report exports (AR aging reports, etc.) have title/date/subtotal
// rows mixed in with real customer rows — this importer is for a plain
// customer list, so those artifacts would otherwise get created as garbage
// "customers" (title text, "Total for X", aging-bucket labels).
const REPORT_ARTIFACT_PATTERNS = [
  /report$/i,
  /^as of\b/i,
  /^total\b/i,
  /days?\s+past\s+due$/i,
  /^current$/i,
  /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday),/i,
];

export function looksLikeReportArtifact(name: string): boolean {
  const trimmed = name.trim();
  return REPORT_ARTIFACT_PATTERNS.some((p) => p.test(trimmed));
}

export function detectColumns(rows: SheetRow[]): { header: string[]; mapping: ColumnMapping; hasHeader: boolean } {
  const header = (rows[0] || []).map((c) => String(c || "").trim());
  const headerLower = header.map((h) => h.toLowerCase());
  const nameIdx = matchColumn(headerLower, NAME_SYNONYMS);
  const emailIdx = matchColumn(headerLower, EMAIL_SYNONYMS);

  if (nameIdx != null || emailIdx != null) {
    return { header, mapping: { name: nameIdx, email: emailIdx }, hasHeader: true };
  }

  // No header word recognized — fall back to positional columns (first =
  // name, second = email) and figure out whether row 0 is itself a data
  // row or an unrecognized header by checking whether it (or later rows)
  // has an email-shaped second column.
  const sample = rows.slice(0, 6).filter((r) => r && r.some((c) => String(c || "").trim()));
  const row0LooksLikeData = sample.length > 0 && looksLikeEmail(sample[0][1]);
  const anyRowLooksLikeData = sample.some((r) => looksLikeEmail(r[1]));
  const hasHeader = !row0LooksLikeData && anyRowLooksLikeData;

  const width = Math.max(0, ...rows.slice(0, 6).map((r) => (r ? r.length : 0)));
  return {
    header,
    mapping: { name: width >= 1 ? 0 : null, email: width >= 2 ? 1 : null },
    hasHeader,
  };
}

export interface ParsedCustomerRows {
  rows: CustomerRow[];
  skippedArtifacts: number;
}

export function parseCustomerRows(rows: SheetRow[], mapping: ColumnMapping, hasHeader: boolean): ParsedCustomerRows {
  const out: CustomerRow[] = [];
  let skippedArtifacts = 0;
  const startIdx = hasHeader ? 1 : 0;
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some((c) => String(c || "").trim())) continue;
    const name = cell(row, mapping.name);
    if (!name) continue;
    if (looksLikeReportArtifact(name)) {
      skippedArtifacts++;
      continue;
    }
    const email = cell(row, mapping.email);
    out.push({ name, email: email || undefined });
  }
  return { rows: out, skippedArtifacts };
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
